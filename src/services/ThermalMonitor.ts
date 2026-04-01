/**
 * ThermalMonitor.ts
 * * Monitors device temperature and RAM usage.
 * Dynamically scales down CPU threads for llama.cpp/whisper.cpp if the device overheats.
 * Crucial for preventing OS-level OOM (Out Of Memory) kills.
 */
