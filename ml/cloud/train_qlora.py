"""QLoRA fine-tune on ONE 80 GB NVIDIA GPU, then merge into a model vLLM can serve.
Run on the rented GPU:  pip install -U transformers peft trl bitsandbytes datasets accelerate && python train_qlora.py
Expects data/train.jsonl and data/valid.jsonl (chat "messages" format, made by ml/export_dataset.py).
NOTE: library argument names change between versions (e.g. max_length / max_seq_length, processing_class / tokenizer).
If you get a TypeError, check the error message and rename the argument it complains about."""
import os, torch
from datasets import load_dataset
from peft import LoraConfig, PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTTrainer, SFTConfig

BASE = os.getenv("BASE_MODEL", "Qwen/Qwen2.5-Coder-32B-Instruct")
tok = AutoTokenizer.from_pretrained(BASE)
model = AutoModelForCausalLM.from_pretrained(BASE, device_map="auto", quantization_config=BitsAndBytesConfig(
    load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_use_double_quant=True))
ds = load_dataset("json", data_files={"train": "data/train.jsonl", "validation": "data/valid.jsonl"})
cfg = SFTConfig(output_dir="out", num_train_epochs=2, per_device_train_batch_size=1, gradient_accumulation_steps=16,
                learning_rate=1e-4, lr_scheduler_type="cosine", warmup_ratio=0.05, logging_steps=5, eval_strategy="steps",
                eval_steps=50, save_steps=50, save_total_limit=2, bf16=True, gradient_checkpointing=True, max_length=8192)
trainer = SFTTrainer(model=model, args=cfg, train_dataset=ds["train"], eval_dataset=ds["validation"], processing_class=tok,
                     peft_config=LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, target_modules="all-linear", task_type="CAUSAL_LM"))
trainer.train(); trainer.save_model("adapter")
del trainer, model; torch.cuda.empty_cache()
base = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype=torch.bfloat16, device_map="auto")
PeftModel.from_pretrained(base, "adapter").merge_and_unload().save_pretrained("tavix-merged")
tok.save_pretrained("tavix-merged"); print("Saved ./tavix-merged. Download it or serve it with serve.sh")
