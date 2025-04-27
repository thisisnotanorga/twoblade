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