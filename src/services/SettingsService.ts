import RNFS from 'react-native-fs';

const SETTINGS_FILE_PATH = `${RNFS.DocumentDirectoryPath}/settings.json`;
const DEFAULT_HOST = '172.16.10.142';
const DEFAULT_LLM_MODEL = 'qwen3.6:35b';

export class SettingsService {
    private static cachedHost: string | null = null;
    private static cachedLlmModel: string | null = null;

    private static async readSettings(): Promise<{ serverHost?: string; llmModel?: string }> {
        try {
            const exists = await RNFS.exists(SETTINGS_FILE_PATH);
            if (exists) {
                const content = await RNFS.readFile(SETTINGS_FILE_PATH, 'utf8');
                return JSON.parse(content) || {};
            }
        } catch (e) {
            console.error('[SettingsService] Failed to read settings file:', e);
        }
        return {};
    }

    public static async getServerHost(): Promise<string> {
        if (this.cachedHost !== null) {
            return this.cachedHost;
        }

        const settings = await this.readSettings();
        this.cachedHost = settings.serverHost?.trim() || DEFAULT_HOST;
        return this.cachedHost;
    }

    public static async setServerHost(host: string): Promise<void> {
        try {
            const trimmedHost = host.trim();
            this.cachedHost = trimmedHost;
            
            const settings = await this.readSettings();
            settings.serverHost = trimmedHost;
            
            await RNFS.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings), 'utf8');
        } catch (e) {
            console.error('[SettingsService] Failed to write server host:', e);
        }
    }

    public static async getLlmModel(): Promise<string> {
        if (this.cachedLlmModel !== null) {
            return this.cachedLlmModel;
        }

        const settings = await this.readSettings();
        this.cachedLlmModel = settings.llmModel?.trim() || DEFAULT_LLM_MODEL;
        return this.cachedLlmModel;
    }

    public static async setLlmModel(model: string): Promise<void> {
        try {
            const trimmedModel = model.trim();
            this.cachedLlmModel = trimmedModel;
            
            const settings = await this.readSettings();
            settings.llmModel = trimmedModel;
            
            await RNFS.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings), 'utf8');
        } catch (e) {
            console.error('[SettingsService] Failed to write LLM model:', e);
        }
    }
}
