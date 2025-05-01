# Twoblade

**Twoblade** is an interface for **SHARP** (**S**elf-**H**osted **A**ddress **R**outing **P**rotocol) - a decentralized email system that uses the `#` symbol for addressing (e.g., `user#domain.com`).

## SHARP
SHARP's HTML allows for reactive styling:
```html
<!-- Theme-aware styling -->
<div style="background: {$LIGHT ? '#ffffff' : '#1a1a1a'}">
<p style="color: {$DARK ? '#ffffff' : '#000000'}">Content</p>

<!-- Complex conditional styling -->
<div style="
    background: {$DARK ? '#2d2d2d' : '#f0f0f0'};
    border: {$DARK ? '1px solid #404040' : '1px solid #ddd'};
    box-shadow: {$DARK ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)'};
">

<!-- Available operators: $DARK, $LIGHT -->
```

## Attachments Setup
```bash
wget https://github.com/Backblaze/B2_Command_Line_Tool/releases/latest/download/b2-linux -O "b2"
chmod +x b2
./b2 account authorize
./b2 bucket update --cors-rules '[
  {
    "corsRuleName": "allowS3PutFromLocalhost",
    "allowedOrigins": ["http://localhost:5173", "REPLACE_ME_WITH_PUBLIC_DOMAIN"],
    "allowedOperations": [
      "s3_put",
      "s3_get"
    ],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag", "x-amz-request-id"],
    "maxAgeSeconds": 3600
  }
]' REPLACE_ME_WITH_BUCKET_NAME
```
- Note to replace `REPLACE_ME_WITH_PUBLIC_DOMAIN` and `REPLACE_ME_WITH_BUCKET_NAME`