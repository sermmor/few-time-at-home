# FT@Home App

Aplicación Flutter standalone con estilo **cyberpunk** que reúne cuatro
herramientas del ecosistema **Few Time @ Home**: Pomodoro, Tiempo (AEMET),
Neo Notas y RSS. Los datos se sincronizan a través de Supabase (la misma
instancia que usa `mobileApp`).

## Plataformas soportadas

| Plataforma | Estado                          |
|------------|---------------------------------|
| Windows    | ✅ Pantalla completa             |
| macOS      | ✅ Ventana maximizada            |
| Linux      | ✅ Pantalla completa             |
| Android    | ✅ Tablets horizontal · Móviles vertical |
| iOS/iPad   | ❌ No contemplado               |

---

## 1 — Funcionalidades

### Pomodoro

Temporizador con cadenas de intervalos configurables desde Supabase
(`pomodoro_config`). Incluye modos predefinidos (trabajo, descanso, cadena
larga…) y entrada manual de duración. Alarma sonora al completar cada paso y
wakelock para que la pantalla no se apague.

### Tiempo (AEMET)

Pronóstico diario (grid en escritorio, lista en móvil) y hora a hora
consumiendo directamente la API XML de AEMET. Colores de temperatura, viento,
humedad, probabilidad de lluvia e índice UV.

### Neo Notas

Editor de notas en Markdown con vista previa en tiempo real (side-by-side en
escritorio). Las notas se almacenan como ficheros `.md` en el directorio de
documentos local (`ftah_notes/`). Soporta exportar a PDF e importar ficheros
`.md` desde el sistema de archivos.

### RSS

Lector de feeds RSS sincronizado con Supabase (`rss_cache`). Categorías:
Mastodon, Blog, Noticias, YouTube (con subcategorías), Favoritos y Guardados.
Caché local en JSON para lectura offline.

---

## 2 — Requisitos

```bash
flutter --version   # Flutter ≥ 3.11.5 / Dart ≥ 3.1.0
```

### Windows (una sola vez)

El plugin `flutter_secure_storage` (dependencia transitiva) requiere las
**ATL (Active Template Library)**:

1. Abre el **Visual Studio Installer**.
2. **Modify** → pestaña **Individual components**.
3. Marca **C++ ATL for latest v142 build tools (x86 & x64)**.
4. Haz clic en **Modify**.

### Linux (una sola vez)

```bash
sudo apt-get install -y ninja-build libgtk-3-dev
```

---

## 3 — Ejecución / compilación

### Generar scaffolding nativo (primera vez)

```bash
cd ftahApp
flutter create --platforms=android,windows,macos,linux .
```

### Ejecutar en desarrollo

```bash
# Windows
flutter run -d windows

# macOS (desde un Mac)
flutter run -d macos

# Linux
flutter run -d linux

# Android (dispositivo o emulador)
flutter run -d <device-id>
```

### Compilar release

```bash
flutter build windows --release
flutter build macos   --release    # solo desde macOS
flutter build linux   --release
flutter build apk     --release    # Android
```

---

## 4 — CI / GitHub Actions

El workflow **`.github/workflows/build-ftah-app.yml`** lanza cuatro jobs en
paralelo al ejecutarse manualmente (*workflow_dispatch*):

| Job     | Runner           | Artefacto                         |
|---------|------------------|-----------------------------------|
| Windows | `windows-latest` | Carpeta Release (`ftah-app-windows`) |
| macOS   | `macos-14`       | `ftah_app.zip` (`ftah-app-macos`)   |
| Linux   | `ubuntu-latest`  | `ftah_app_linux.tar.gz` (`ftah-app-linux`) |
| Android | `ubuntu-latest`  | `app-debug.apk` (`ftah-app-android`) |

Los artefactos se descargan desde la página **Actions → Summary → Artifacts**
del repositorio en GitHub.

### Instalar en macOS (desde el artefacto)

1. Descarga y extrae `ftah_app.zip` → obtendrás `ftah_app.app`.
2. Cópialo a `/Applications` (o donde prefieras).
3. Elimina el atributo de cuarentena:

   ```bash
   xattr -cr ~/Downloads/ftah_app.app
   ```

4. Abre `ftah_app.app`.

---

## 5 — Estructura del proyecto

```
ftahApp/
  lib/
    main.dart                         ← entry point, fullscreen / orientación
    core/
      theme.dart                      ← paleta cyberpunk (CyberColors, CyberPanel…)
      supabase_config.dart            ← URL + anonKey de Supabase
    models/
      timer_mode_model.dart           ← cadenas de Pomodoro
      rss_item.dart                   ← modelo de artículo RSS
      aemet_models.dart               ← DailyWeatherRow, HourlyWeatherRow
    services/
      pomodoro_service.dart           ← fetch modos desde Supabase
      rss_service.dart                ← descarga + caché local de feeds
      aemet_service.dart              ← parsing XML directo de AEMET
      notes_service.dart              ← CRUD ficheros .md en documentos
    screens/
      home_screen.dart                ← NavigationRail (≥600dp) / BottomNav (<600dp)
      pomodoro_screen.dart            ← temporizador + selector de cadena
      weather_screen.dart             ← tabs Diario / Hora a hora
      notes_screen.dart               ← grid + editor Markdown
      rss_screen.dart                 ← sidebar feeds (desktop) / chips (móvil)
  assets/
    alarm.mp3                         ← sonido de alarma Pomodoro
  pubspec.yaml
```

---

## 6 — Diseño responsivo

La app detecta el tamaño de pantalla para adaptar el layout:

- **Desktop / tablet** (≥ 600 dp de ancho): `NavigationRail` lateral, layouts
  en `Row` con sidebar + contenido, grid de tarjetas.
- **Móvil** (< 600 dp): `BottomNavigationBar`, layouts verticales en scroll,
  listas simples.

En Android la orientación se fija automáticamente al arrancar:

- **Teléfonos** (`shortestSide < 600`): retrato.
- **Tablets** (`shortestSide ≥ 600`): horizontal.

---

## 7 — Notas

- Los datos de Pomodoro y RSS se obtienen de **Supabase** (misma instancia que
  `mobileApp`). La configuración se encuentra en `core/supabase_config.dart`.
- El servicio de Tiempo consume la **API pública de AEMET** directamente
  (XML → modelos Dart). No requiere backend propio.
- Las notas se guardan en el **sistema de archivos local**
  (`path_provider` → directorio de documentos / `ftah_notes/`).
- `IndexedStack` se usa en `home_screen.dart` para preservar el estado de cada
  pestaña al cambiar de sección.
