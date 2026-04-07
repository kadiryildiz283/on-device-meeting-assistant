import { PermissionsAndroid, Platform } from 'react-native';

export const requestEssentialPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
        const permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        // Android 13+ requires explicit notification permission
        if (Number(Platform.Version) >= 33) {
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }

        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

        const isAudioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        const isNotifGranted = Number(Platform.Version) < 33 || granted[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;

        if (!isAudioGranted || !isNotifGranted) {
            console.error("[Permissions] Critical permissions denied.");
            return false;
        }

        console.log("[Permissions] All systems go.");
        return true;
    } catch (err) {
        console.warn("[Permissions] Error requesting permissions:", err);
        return false;
    }
};
