import FingerprintJS, { GetResult } from '@fingerprintjs/fingerprintjs';

let fpPromise: ReturnType<typeof FingerprintJS.load> | null = null;

export interface DeviceFingerprint {
  visitorId: string;
  components: {
    platform: string | undefined;
    timezone: string | undefined;
    screenResolution: string | undefined;
    language: string | undefined;
    userAgent: string | undefined;
  };
}

export const getDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  
  const fp = await fpPromise;
  const result: GetResult = await fp.get();
  
  // Extract component values safely
  const getComponentValue = <T>(component: { value?: T } | undefined): T | undefined => {
    if (component && 'value' in component) {
      return component.value;
    }
    return undefined;
  };

  const platform = getComponentValue(result.components.platform as { value?: string });
  const timezone = getComponentValue(result.components.timezone as { value?: string });
  const screenRes = getComponentValue(result.components.screenResolution as { value?: number[] });
  const languages = getComponentValue(result.components.languages as { value?: string[][] });
  
  return {
    visitorId: result.visitorId,
    components: {
      platform,
      timezone,
      screenResolution: Array.isArray(screenRes) ? screenRes.join('x') : undefined,
      language: Array.isArray(languages) && languages[0]?.[0] ? languages[0][0] : undefined,
      userAgent: navigator.userAgent,
    }
  };
};
