from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

model_dir = Path(r"C:/Users/ADMIN/OneDrive/CODES/WebD Codes/Projects/Basket/plum/services/classification-services/finetuned_mail_model")

assert model_dir.exists(), f"Model dir not found: {model_dir}"
assert (model_dir / "config.json").exists(), "config.json missing"
assert (model_dir / "model.safetensors").exists() or (model_dir / "pytorch_model.bin").exists(), "model file missing (model.safetensors or pytorch_model.bin)"

model_path_for_hf = model_dir.as_posix()

tokenizer = AutoTokenizer.from_pretrained(model_path_for_hf, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(model_path_for_hf, local_files_only=True)

email_text = """
Hi Tony,

I wanted to take a moment to reflect on how the transition period unfolded after Ananya’s handover. From what I’ve seen, the continuity across deliverables was smoother than we initially expected, especially considering the overlap of the analytics migration and UI audit. The weekly summaries you maintained were particularly helpful in keeping the leadership briefed without additional syncs.

There were a few delays reported on the documentation side, but after cross-checking with the infra team, it appears those were mostly due to version mismatches on their end, not ours. So, no immediate adjustments are needed from your side. I’ve already communicated the clarification to Operations.

Also, regarding the budget approvals for Q4, Finance confirmed that our prior allocations remain valid until December. This means we won’t need to submit any new justifications unless the headcount changes, which isn’t expected this cycle. So, you can safely continue with the current provisioning structure.

There were some suggestions from Ananya before her exit about consolidating reporting templates. I had a word with Rajeev from the data team, and he’s planning to pilot one of those formats internally next week. Once that’s done, we’ll see if there’s any visible efficiency gain. You don’t need to take any action on this until then.

By the way, the feedback from HR on the revised handoff deck was quite positive. They mentioned that the clarity in workflow transitions was “refreshing compared to earlier submissions.” That’s a direct reflection of your consistency in keeping information standardized — something that tends to go unnoticed, but I genuinely appreciate it.

The leadership offsite next month will likely bring up a few realignment discussions, but I doubt they’ll affect our current streams directly. If they do, I’ll let you know. Until then, just maintain the same reporting cadence and continue monitoring the dashboards.

I’ve attached the closing summary for the transition phase for your reference — nothing needs to be reviewed or sent back, just for your records.

Thanks again for your composure and patience throughout this entire realignment. You’ve handled it with quiet professionalism, which honestly set a great tone for the rest of the team.

Best,
Ritika
"""

inputs = tokenizer(email_text, return_tensors="pt", truncation=True, padding=True)
model.eval()
with torch.no_grad():
    outputs = model(**inputs)

probs = torch.sigmoid(outputs.logits)[0]
reply_label = "Reply-YES" if probs[0] > 0.3 else "Reply-NO"
action_label = "Action-YES" if probs[1] > 0.3 else "Action-NO"

print(f"{reply_label}, {action_label}")
