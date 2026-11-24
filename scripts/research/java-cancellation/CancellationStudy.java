import java.io.RandomAccessFile;
import java.nio.channels.FileLock;
import java.nio.file.Path;
import java.nio.file.Paths;

/** One-key study of cooperative cancellation between dispatcher processes. */
public final class CancellationStudy {
    private static Ledger.Entry find(Path store, String journal, String key) throws Exception {
        for (Ledger.Entry entry : Ledger.read(store.resolve(journal + ".wal"))) {
            if (entry.key.equals(key)) return entry;
        }
        return null;
    }

    private static void record(Path store, String journal, String key, String body) throws Exception {
        Ledger.apply(store.resolve(journal + ".wal"), key, body, "none");
    }

    private static void haltAt(String fault, String boundary) {
        if (boundary.equals(fault)) Runtime.getRuntime().halt(23);
    }

    private static String recover(Path store, Ledger.Entry intent, int port, String fault) throws Exception {
        String key = intent.key;
        Ledger.Entry receipt = find(store, "receipts", key);
        if (find(store, "history", key) != null) return "COMPLETED";
        if (find(store, "cancellations", key) != null) {
            if (receipt != null) return "CANCELLED_WITH_RECEIPT";
            return find(store, "started", key) == null
                ? "CANCELLED_BEFORE_SEND" : "CANCELLED_OUTCOME_UNKNOWN";
        }

        String result;
        if (receipt == null) {
            record(store, "started", key, intent.body);
            haltAt(fault, "start");
            result = Workflow.deliver(port, intent);
            haltAt(fault, "delivery");
            record(store, "receipts", key, result);
            haltAt(fault, "receipt");
        } else {
            result = receipt.body;
        }
        record(store, "history", key, intent.body + " => " + result);
        return "COMPLETED";
    }

    public static void main(String[] args) throws Exception {
        Path store = Paths.get(args[1]);
        String key = args[2];
        // Cancellation and delivery share the same lock, including the baseline dispatcher's lock.
        try (RandomAccessFile owner = new RandomAccessFile(store.resolve("dispatcher.lock").toFile(), "rw");
             FileLock ignored = owner.getChannel().lock()) {
            Ledger.Entry intent = find(store, "intents", key);
            if (intent == null) throw new IllegalArgumentException("unknown intent");
            if ("cancel".equals(args[0])) {
                record(store, "cancellations", key, "cancel-requested");
                System.out.println("CANCELLATION_RECORDED");
            } else if ("recover".equals(args[0])) {
                System.out.println(recover(store, intent, Integer.parseInt(args[3]), args[4]));
            } else {
                throw new IllegalArgumentException("unknown operation");
            }
        }
    }
}
