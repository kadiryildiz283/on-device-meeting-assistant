import RNFS from 'react-native-fs';

export const MODEL_FILE_NAME = 'qwen2.5-7b-instruct-q4_k_m.gguf';
export const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/${MODEL_FILE_NAME}`;
const DOWNLOAD_URL = 'https://huggingface.co/paultimothymooney/Qwen2.5-7B-Instruct-Q4_K_M-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf?download=true';

export class ModelDownloader {
    static async checkModelExists(): Promise<boolean> {
        return await RNFS.exists(MODEL_PATH);
    }

    static async downloadModel(onProgress: (percentage: number) => void): Promise<void> {
        const exists = await this.checkModelExists();
        if (exists) return;

        const options: RNFS.DownloadFileOptions = {
            fromUrl: DOWNLOAD_URL,
            toFile: MODEL_PATH,
            progressInterval: 1000,
            progress: (res) => {
                const percentage = (res.bytesWritten / res.contentLength) * 100;
                onProgress(Math.round(percentage));
            },
        };

        const ret = RNFS.downloadFile(options);
        await ret.promise;
    }
}
