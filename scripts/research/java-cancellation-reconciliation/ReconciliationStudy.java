import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayInputStream;
import java.io.DataInputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.zip.CRC32;

/** Read-only reconciliation of one cancelled effect against the pinned teaching journal. */
public final class ReconciliationStudy {
    private static final String ENDPOINT = "/effect-status";
    private static final String KEY_HEADER = "Idempotency-Key";
    private static final String DIGEST_HEADER = "X-Request-SHA256";
    private static final String SNAPSHOT_HEADER = "X-Reconciliation-Snapshot";
    private static final String COMPLETE_SNAPSHOT = "complete-v1";
    private static final Pattern HTTP_KEY = Pattern.compile("[!-~]{1,200}");
    private static final Pattern SHA256 = Pattern.compile("[a-f0-9]{64}");
    private static final Pattern EXECUTED = Pattern.compile("EXECUTED [1-9][0-9]{0,9}\n");
    private static final int MAX_RESPONSE_BYTES = 64;

    private static boolean validRequest(String key, String digest) {
        return key != null && HTTP_KEY.matcher(key).matches()
            && digest != null && SHA256.matcher(digest).matches();
    }

    private static String onlyValue(Headers headers, String name) {
        List<String> values = headers.get(name);
        return values != null && values.size() == 1 ? values.get(0) : null;
    }

    private static String readSnapshot(Path journal, String key, String requestDigest) throws Exception {
        // The original Ledger.read opens in "rw" mode and repairs partial tails.
        // Query under a shared lock on an existing file and require every frame to be intact.
        try (RandomAccessFile file = new RandomAccessFile(journal.toFile(), "r");
             FileLock lock = file.getChannel().lock(0, Long.MAX_VALUE, true)) {
            long snapshotSize = file.length();
            Set<String> seen = new HashSet<>();
            String outcome = "NO_RECORD";
            while (file.getFilePointer() < snapshotSize) {
                if (snapshotSize - file.getFilePointer() < 12) {
                    throw new IOException("incomplete frame header");
                }
                int magic = file.readInt();
                int size = file.readInt();
                int checksum = file.readInt();
                if (magic != Ledger.MAGIC || size < 1 || size > Ledger.MAX
                    || size > snapshotSize - file.getFilePointer()) {
                    throw new IOException("invalid or incomplete frame");
                }
                byte[] frame = new byte[size];
                file.readFully(frame);
                CRC32 crc = new CRC32();
                crc.update(frame);
                if ((int) crc.getValue() != checksum) {
                    throw new IOException("frame checksum mismatch");
                }
                try (DataInputStream payload = new DataInputStream(new ByteArrayInputStream(frame))) {
                    String recordedKey = payload.readUTF();
                    String recordedDigest = payload.readUTF();
                    String recordedBody = payload.readUTF();
                    int ordinal = payload.readInt();
                    if (recordedKey.isEmpty() || recordedKey.length() > 200
                        || recordedBody.getBytes(StandardCharsets.UTF_8).length > 16000
                        || !recordedDigest.equals(Ledger.hash(recordedBody))
                        || payload.available() != 0 || !seen.add(recordedKey) || ordinal != seen.size()) {
                        throw new IOException("invalid frame data");
                    }
                    if (key.equals(recordedKey)) {
                        outcome = requestDigest.equals(recordedDigest) ? "EXECUTED " + ordinal : "CONFLICT";
                    }
                }
            }
            if (file.length() != snapshotSize) {
                throw new IOException("journal size changed during read");
            }
            return outcome;
        }
    }

    private static void reply(HttpExchange exchange, int code, String body) throws IOException {
        byte[] bytes = (body + "\n").getBytes(StandardCharsets.US_ASCII);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=us-ascii");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(code, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    private static void handle(HttpExchange exchange, Path journal) throws IOException {
        try {
            if (!ENDPOINT.equals(exchange.getRequestURI().getRawPath())) {
                reply(exchange, 404, "NOT_FOUND");
                return;
            }
            if (!"GET".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Allow", "GET");
                reply(exchange, 405, "METHOD_NOT_ALLOWED");
                return;
            }
            String key = onlyValue(exchange.getRequestHeaders(), KEY_HEADER);
            String digest = onlyValue(exchange.getRequestHeaders(), DIGEST_HEADER);
            if (!validRequest(key, digest)) {
                reply(exchange, 400, "INVALID_QUERY");
                return;
            }
            String outcome;
            try {
                outcome = readSnapshot(journal, key, digest);
            } catch (Exception unavailable) {
                reply(exchange, 503, "UNAVAILABLE");
                return;
            }
            exchange.getResponseHeaders().set(KEY_HEADER, key);
            exchange.getResponseHeaders().set(DIGEST_HEADER, digest);
            exchange.getResponseHeaders().set(SNAPSHOT_HEADER, COMPLETE_SNAPSHOT);
            reply(exchange, "CONFLICT".equals(outcome) ? 409 : 200, outcome);
        } finally {
            exchange.close();
        }
    }

    private static void serve(Path journal) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(ENDPOINT, exchange -> handle(exchange, journal));
        server.start();
        System.out.println("READY " + server.getAddress().getPort());
        System.out.flush();
    }

    private static boolean responseHeaderMatches(HttpURLConnection connection, String name, String expected) {
        boolean found = false;
        for (Map.Entry<String, List<String>> field : connection.getHeaderFields().entrySet()) {
            if (!name.equalsIgnoreCase(field.getKey())) continue;
            if (found || !Collections.singletonList(expected).equals(field.getValue())) return false;
            found = true;
        }
        return found;
    }

    private static String responseBody(HttpURLConnection connection, int code) throws IOException {
        long length = connection.getContentLengthLong();
        if (length < 1 || length > MAX_RESPONSE_BYTES) return "";
        try (InputStream stream = code == 409 ? connection.getErrorStream() : connection.getInputStream()) {
            if (stream == null) return "";
            byte[] bytes = new byte[(int) length];
            new DataInputStream(stream).readFully(bytes);
            if (stream.read() != -1) return "";
            return new String(bytes, StandardCharsets.US_ASCII);
        } catch (EOFException truncated) {
            return "";
        }
    }

    private static String unknown(String reason) {
        return "RECONCILIATION_UNKNOWN " + reason;
    }

    private static String query(int port, String key, String digest, int timeoutMs) throws IOException {
        if (!validRequest(key, digest) || port < 1 || port > 65535 || timeoutMs < 1) {
            throw new IllegalArgumentException("invalid port, key, digest or timeout");
        }
        HttpURLConnection connection = (HttpURLConnection)
            new URL("http://127.0.0.1:" + port + ENDPOINT).openConnection(Proxy.NO_PROXY);
        connection.setRequestMethod("GET");
        connection.setInstanceFollowRedirects(false);
        connection.setUseCaches(false);
        connection.setConnectTimeout(timeoutMs);
        connection.setReadTimeout(timeoutMs);
        connection.setRequestProperty("Connection", "close");
        connection.setRequestProperty(KEY_HEADER, key);
        connection.setRequestProperty(DIGEST_HEADER, digest);
        try {
            int code = connection.getResponseCode();
            if (code == 503) return unknown("UNAVAILABLE");
            if ((code != 200 && code != 409)
                || !responseHeaderMatches(connection, KEY_HEADER, key)
                || !responseHeaderMatches(connection, DIGEST_HEADER, digest)
                || !responseHeaderMatches(connection, SNAPSHOT_HEADER, COMPLETE_SNAPSHOT)) {
                return unknown("INVALID_RESPONSE");
            }
            String answer = responseBody(connection, code);
            if (code == 409 && answer.equals("CONFLICT\n")) return unknown("CONFLICT");
            if (code == 200 && answer.equals("NO_RECORD\n")) return "RECONCILED_NO_RECORD";
            if (code == 200 && EXECUTED.matcher(answer).matches()) {
                try {
                    return "RECONCILED_EXECUTED " + Integer.parseInt(answer.trim().substring("EXECUTED ".length()));
                } catch (NumberFormatException outsideOrdinalRange) {
                    return unknown("INVALID_RESPONSE");
                }
            }
            return unknown("INVALID_RESPONSE");
        } catch (SocketTimeoutException timeout) {
            return unknown("TIMEOUT");
        } catch (IOException unavailable) {
            return unknown("UNAVAILABLE");
        } finally {
            connection.disconnect();
        }
    }

    public static void main(String[] args) throws IOException {
        if (args.length == 2 && "serve".equals(args[0])) {
            serve(Paths.get(args[1]));
        } else if (args.length == 5 && "query".equals(args[0])) {
            System.out.println(query(Integer.parseInt(args[1]), args[2], args[3], Integer.parseInt(args[4])));
        } else {
            throw new IllegalArgumentException("use serve WAL or query PORT KEY REQUEST_SHA256 TIMEOUT_MS");
        }
    }
}
