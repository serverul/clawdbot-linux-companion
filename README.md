# Clawdbot Linux Companion

Aplicație desktop pentru Linux care se integrează cu Clawdbot pentru automatizări și notificări.

## Caracteristici

- 🌐 Interfață web încorporată pentru acces Clawdbot
- 🔔 Notificări desktop
- 📡 Conectivitate Gateway pentru automatizări
- 🔧 Configurare simplă
- 🎨 Dark theme modern

## Platformă

- **Linux** - Ubuntu 20.04+, Debian, Fedora
- Electron Runtime (inclus în pachet)
- Conexiune internet pentru Clawdbot Gateway

## Instalare

### Din fișier .deb (Ubuntu/Debian)
```bash
sudo dpkg -i clawdbot-linux-companion_1.0.0_amd64.deb
sudo apt-get install -f # rezolvă dependențele
```

### Din fișier .rpm (Fedora/RHEL)
```bash
sudo dnf install clawdbot-linux-companion_1.0.0.x86_64.rpm
```

### Din AppImage
```bash
chmod +x "Clawdbot Companion-1.0.0.AppImage"
./"Clawdbot Companion-1.0.0.AppImage"
```

## Cerințe

- Ubuntu 20.04+ / Fedora 34+
- Electron Runtime (inclus)
- Conexiune internet pentru Clawdbot Gateway

## Configurare

Pornește aplicația și configurează:
- URL Gateway Clawdbot
- Port conexiune
- Notificări activate/dezactivate

## Dezinstalare

# Ubuntu/Debian
sudo apt remove clawdbot-linux-companion

# Fedora
sudo dnf remove clawdbot-linux-companion

## Build

```bash
npm install
npm run build:linux    # creează .deb, .rpm, AppImage
```

## Licență

MIT License - vezi LICENSE

## Suport

- GitHub: https://github.com/clawdbot
- Issues: https://github.com/clawdbot/clawdbot-linux-companion/issues
