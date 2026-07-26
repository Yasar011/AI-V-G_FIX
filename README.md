# AI Vision QC — Laptop Capture Pipeline

This is the part of the project that runs **locally on your laptop**: camera
capture → YOLOv8 inference → upload to Cloudinary → log to Firebase.
The dashboard (Vercel-hosted) is a separate piece that just *reads* what
this script writes — it comes next.

Your rig (i5 9th gen, GTX 1650 Ti, 16GB RAM, NVMe) is genuinely good for
this: the 1650 Ti has 4GB of CUDA-capable VRAM, which is plenty for YOLOv8n/s
inference in real time, and enough for fine-tuning small batches later if
you ever want to train locally instead of on Colab.

## 1. Set up the environment

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

### Get GPU acceleration working (optional but recommended)

By default `pip install` gives you CPU-only PyTorch. To actually use your
1650 Ti, install the CUDA build instead:

```bash
pip uninstall torch torchvision -y
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

Then check it's detected:

```bash
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

Should print `True` and `NVIDIA GeForce GTX 1650 Ti`. If it prints `False`,
the script still works — it just falls back to CPU (slower, but your i5 9th
gen can handle YOLOv8n fine for a prototype).

## 2. Get your credentials

**Cloudinary** — Dashboard → Settings → Access Keys. Copy Cloud Name, API
Key, API Secret.

**Firebase** — Project Settings (gear icon) → Service Accounts → Generate
new private key. This downloads a JSON file — save it in this folder as
`firebase-service-account.json` (already gitignored, it will never get
committed). Also grab your Realtime Database URL from the Realtime
Database section — looks like
`https://your-project-id-default-rtdb.firebaseio.com`.

## 3. Configure

```bash
cp .env.example .env      # macOS/Linux
copy .env.example .env    # Windows
```

Open `.env` and fill in the values you just collected.

## 4. Run it

```bash
python capture.py
```

- A live camera window opens.
- Place a piece in frame, press **SPACE** to capture and inspect it.
- The result (PASS / REVIEW / FAIL) flashes on screen and prints in the
  terminal, along with upload/logging progress.
- Press **Q** to quit.

## About the model right now

Stage 1 is done: `MODEL_PATH` points at `models/defect_best_stage1.pt`, a
YOLOv8n fine-tuned on a public Roboflow fabric-defect dataset (4 classes:
`Cassure`, `Tache`, `defaut`, `fil tire ou gros`). mAP50=0.542,
mAP50-95=0.306 — a real proof-of-concept, not production-grade yet, but it
actually detects fabric defects instead of COCO objects.

To reproduce or retrain, use `train_stage1.py` (needs a free Roboflow API
key):

```bash
python train_stage1.py --api-key YOUR_KEY --workspace WORKSPACE --project PROJECT --version 1
```

Stage 3 (the real goal) is retraining on your own captured garments via
the self-learning loop: flagged pieces get confirmed/corrected with
`review.py`, then `export_dataset.py` turns verified corrections into a
YOLO-format dataset you can fine-tune from `models/defect_best_stage1.pt`
instead of starting over from the generic pretrained weights.

## Project structure

```
ai_vision_qc/
├── capture.py              # main loop — run this
├── src/
│   ├── config.py            # loads .env
│   ├── inference.py         # YOLOv8 wrapper
│   ├── uploader.py          # Cloudinary upload
│   └── database.py          # Firebase RTDB logging
├── captures/                 # saved images (gitignored)
├── .env.example
├── .env                       # your real credentials (gitignored, never committed)
├── firebase-service-account.json   # (gitignored, never committed)
└── requirements.txt
```

## Pushing this to GitHub

```bash
git init
git add .
git commit -m "Laptop capture pipeline — Stage 2 prototype"
git branch -M main
git remote add origin https://github.com/<your-username>/ai-vision-qc.git
git push -u origin main
```

`.env` and `firebase-service-account.json` are already in `.gitignore`, so
your credentials won't end up on GitHub — double-check `git status` before
your first commit just to be safe.
