import { findByProps } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { Forms } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";

const { FormInput, FormRow, FormSection } = Forms;
const { ScrollView } = ReactNative;

// Default settings
storage.targetLang ??= "en";

// Free Google Translate endpoint (no API key required)
async function freeTranslate(text: string, target: string): Promise<string> {
    if (!text || text.trim() === "") return "Empty message.";
    
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        // The response is a nested array. We need to combine all sentence chunks.
        if (data && data[0] && Array.isArray(data[0])) {
            return data[0].map((chunk: any) => chunk[0]).join("");
        }
        
        return "Translation failed: unexpected response format.";
    } catch (e: any) {
        return `Translation error: ${e.message}`;
    }
}

let unpatch: (() => void) | undefined;

export default {
    onLoad() {
        // Patch the message context menu (long press on mobile)
        unpatch = after("default", findByProps("showSimpleActionSheet"), ([{ header, options }]: any) => {
            // Check if the header contains a message object with content
            const message = header?.props?.message;
            
            if (message && message.content) {
                options.push({
                    label: "Translate",
                    onPress: async () => {
                        // Show a loading toast
                        showToast("Translating...", 1500);
                        
                        const translated = await freeTranslate(message.content, storage.targetLang);
                        
                        // Show the result in a toast
                        // (Discord toasts auto-dismiss, so 5 seconds is a good default)
                        showToast(`Translated: ${translated}`, 5000);
                    }
                });
            }
        });
    },

    onUnload() {
        unpatch?.();
    },

    settings: () => {
        const [targetLang, setTargetLang] = React.useState(storage.targetLang);

        const save = () => {
            storage.targetLang = targetLang;
            showToast("Settings saved!");
        };

        return (
            <ScrollView style={{ padding: 16 }}>
                <FormSection title="Translation Settings">
                    <FormInput
                        title="Target Language Code"
                        value={targetLang}
                        onChange={setTargetLang}
                        placeholder="e.g. en, es, fr, de, ja"
                        helpText="Use standard ISO 639-1 codes. 'en' = English, 'es' = Spanish, etc."
                    />
                </FormSection>
                <FormRow label="Save Settings" onPress={save} />
            </ScrollView>
        );
    }
};
