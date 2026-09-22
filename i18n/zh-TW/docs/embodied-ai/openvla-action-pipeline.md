---
title: OpenVLA 程式碼導讀：圖像和一句指令，怎樣變成機器人動作？
description: 沿著 processor、視覺投影、動作 Token 與反正規化追蹤一次推理，重點檢查動作單位、邊界索引和部署介面。
slug: /embodied-ai/openvla-action-pipeline
status: published
published_at: '2026-09-22'
updated: '2026-09-22'
reading_minutes: 12
domain: embodied-ai
article_kind: mechanism
difficulty: intermediate
related: ["doc:llm/kv-cache", "lab:action-representation"]
---

看到“視覺—語言—動作模型”，很容易把它想成一個會看圖、再輸出控制指令的聊天機器人。真正需要追問的是：輸出的資料是什麼？它有幾個維度？數字在什麼坐標系、什麼尺度下才有意義？

本文把原版 OpenVLA 當成一個需要讀懂的介面：圖像和文字從哪裡進入，動作數字從哪裡出來，以及這兩個端點之間哪些約定不能丟失。

:::note 這是原始碼導讀，不是機器人實驗
本文由 AI 輔助整理，依據 [OpenVLA 原論文 v3](https://arxiv.org/html/2406.09246v3) 及官方倉庫 2026-09-22 可訪問的原始碼。討論原版自回歸動作 Token 路徑，不覆蓋 OpenVLA-OFT 等後續變體。沒有執行權重、模擬或實體機器人；文中數字算例為教學資料。
:::

## 1. 先看介面，不先看參數量

原版模型將單幅 RGB 觀測與語言任務條件映射為機器人動作。其視覺端融合 DINOv2 與 SigLIP 特徵，經投影進入語言模型空間，再由 Llama 2 骨幹生成動作 Token。論文示例使用七維控制動作。這是論文的架構描述，不意味著所有七維向量都能交給同一臺機械臂。[論文第 3 節](https://arxiv.org/html/2406.09246v3#S3) 給出了這一結構。

```text
RGB 觀測 + 任務文字
  → processor：圖像張量 + 文本 Token
  → 視覺編碼器 + projector
  → 視覺嵌入與文字嵌入拼接
  → 自回歸生成動作 Token
  → Token ID 解碼為正規化數值
  → 資料集統計量反正規化
  → 環境適配器 / 控制器
```

學習時先把最後兩行圈出來。文本生成可以直接顯示給人，動作向量還需要環境解釋；解釋錯誤，數字合法也會執行錯誤。

## 2. 從四個原始碼入口開始

| 文件 / 函數 | 讀它時要回答的問題 |
| --- | --- |
| `experiments/robot/openvla_utils.py` / `get_vla_action` | 輸入圖像怎樣取得？任務怎樣形成提示？ |
| `prismatic/extern/hf/processing_prismatic.py` | 哪些預處理把圖像、文字變成模型張量？ |
| `prismatic/extern/hf/modeling_prismatic.py` / `forward`、`predict_action` | 視覺資訊插在哪裡？輸出怎樣解碼？ |
| `prismatic/vla/action_tokenizer.py` | 連續動作與離散索引如何互轉？ |

官方 [推理輔助函數](https://github.com/openvla/openvla/blob/main/experiments/robot/openvla_utils.py) 從觀測取出圖像，轉換為 RGB，按配置處理裁剪，再調用 processor 和 `predict_action`。原版與 v0.1 的提示模板在函數里分支處理。自己隨意改寫聊天模板，不等同於保持訓練時的介面。

[Processor 實現](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/processing_prismatic.py) 則負責各視覺骨幹需要的預處理與文本分詞。檢查資料時應同時記錄原圖尺寸、裁剪策略和最終張量形狀；不能只檢查“文件能打開”。

## 3. 圖像不會先被翻譯成一段自然語言

在 [模型實現](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/modeling_prismatic.py) 的多模態路徑中，圖像經過視覺骨幹和投影後，以嵌入的形式接在首個文本 Token 之後。注意力遮罩也相應擴展。它不需要先寫出“桌上有一個杯子”再把這句話交給另一個模型。

用形狀理解這個介面更直接：設文本有 N 個位置，圖像產生 P 個 patch 嵌入，語言隱藏寬度為 D，那么拼接後的輸入長度是 N + P，寬度仍為 D。這裡 N、P、D 是符號，不是假設某個檢查點的真實數值。

如果投影輸出寬度不等於 D，拼接就不成立；如果遮罩仍是 N 個位置，注意力輸入也不一致。**圖像進入模型是一份張量契約，不只是一個圖片上傳控件。**

## 4. 動作為什麼也可以使用 Token？

動作離散化把連續數值映射到有限編號，再借用詞表中的 Token 表示編號。訓練目標因此能沿用預測下一個 Token 的形式；Token 在這裡的含義是動作區間，不是某個日常詞語。

真正容易踩坑的是邊界。[ActionTokenizer 原始碼](https://github.com/openvla/openvla/blob/main/prismatic/vla/action_tokenizer.py) 預設使用 `linspace(-1, 1, 256)` 得到邊界，再計算相鄰邊界的中點，所以有 **256 個邊界、255 個中點**。編碼中的 `digitize` 索引與中點索引不是同一個範圍；解碼需要減一並裁剪上界。不能讀到“256 bins”就自行寫出一個不同的等價實現。

下面把它縮小為四個邊界，便於手算。它只演示索引規則，**不是 OpenVLA Tokenizer 的替代實現**：

```javascript
const edges = [-1, -1 / 3, 1 / 3, 1];
const centers = edges.slice(1).map((x, i) => (edges[i] + x) / 2);
function roundTrip(value) {
  const clipped = Math.max(-1, Math.min(1, value));
  const bin = edges.filter((edge) => clipped >= edge).length;
  const index = Math.max(0, Math.min(centers.length - 1, bin - 1));
  return { bin, index, decoded: centers[index] };
}
console.log(roundTrip(1));
// { bin: 4, index: 2, decoded: 0.6666666666666666 }
```

這個例子解釋了為什麼邊界值 1 解碼後並不是 1：離散表示恢復的是區間中心，量化本來就會損失精度。更重要的是，`bin = 4` 不能直接用作只有三個元素的中心陣列索引。

在實際模型中，還要先從生成的詞表 ID 還原動作編號。詞表大小與用於對齊的填充不能混為一談；應沿著 `predict_action` 的程式碼檢查，而不是根據模型名稱猜一個固定數字。

## 5. 反正規化，決定數字的尺度

`predict_action` 使用所選資料集的 `q01`、`q99` 和 mask，把需要反正規化的維度從模型輸出空間映射回動作尺度。對於 mask 為真的某個維度：

```text
action = 0.5 × (normalized + 1) × (q99 - q01) + q01
```

若**教學假設**某軸上下界為 -0.02 和 0.02 米，正規化輸出 0.5 對應 0.01 米；同樣的輸出，若上下界改成 -0.10 和 0.10 米，就變成 0.05 米。五倍差異來自統計量，而不是模型“改變了意圖”。實際單位必須由資料集與控制器確認，原始碼不會自動賦予所有維度“米”的含義。

`unnorm_key` 選擇的是檢查點內的資料集統計項，不是新的任務指令。選錯但碰巧合法的統計項，比明顯缺少一個欄位更難發現。mask 為假的維度保留正規化值，不能對整條向量無差別套公式。以上介面可直接核對 [predict_action 與 get_action_stats](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/modeling_prismatic.py)。

## 6. 從返回陣列到真正執行，還缺什麼？

對於一個準備接入環境的程序，至少應寫出下面這份契約，而不是看到七個數就執行：

| 檢查項 | 應有的明確說明 | 錯配的可能表現 |
| --- | --- | --- |
| 動作含義 | 末端增量、絕對位姿或關節目標 | 方向與移動幅度不符合預期 |
| 參考坐標系 | 世界、基座或工具坐標 | 同一個正方向在環境中不同 |
| 旋轉與單位 | 旋轉表示、角度單位、平移單位 | 量級異常、姿態跳變 |
| 夾爪約定 | 開閉方向、連續值或二值 | “抓取”變成“松開” |
| 時間 | 圖像時間戳、推理耗時、動作執行間隔 | 在舊觀測上繼續動作 |
| 終止與邊界 | 限幅、碰撞處理、終止條件 | 陣列有效但任務不能安全結束 |

這張表是接入時的工程檢查建議，不是原版模型保證具備的安全能力。離線階段先保存輸入和預測，再在環境適配器中檢查形狀、有限數值、範圍與坐標約定。模型輸出通過類型檢查，只說明資料可解析；完成抓取仍需要環境觀測與任務判據。

## 7. 哪些理解已具備，哪些結果還沒有？

現在可以沿原始碼解釋圖像嵌入、動作離散化與反正規化，也可以獨立驗證上面的索引算例。這些是閱讀和算術層面的證據。

本站尚未用該檢查點完成一次模擬閉環，因此這裡沒有成功率、軌跡圖或“實測有效”的結論。已有 [動作表示實驗計劃](/labs/action-representation) 可以接住後續工作：固定環境與動作介面，保存輸入、預測、執行後的觀測和終止原因，再討論模型表現。

若對自回歸生成中的快取感興趣，可繼續閱讀 [KV Cache 拆解](/docs/llm/kv-cache)。但不能因為相鄰動作都用了同一條任務指令，就推斷不同圖像觀測之間可以直接復用整段舊快取；輸入前綴是否相同仍需檢查。
