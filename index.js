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
async function freeTranslate(text, target) {
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

        if (data && data[0] && Array.isArray(data[0])) {
            return data[0].map((chunk) => chunk[0]).join("");
        }

        return "Translation failed: unexpected response format.";
    } catch (e) {
        return `Translation error: ${e.message}`;
    }
}

let unpatch;

export default {
    onLoad() {
        unpatch = after("default", findByProps("showSimpleActionSheet"), ([{ header, options }]) => {
            const message = header?.props?.message;

            if (message && message.content) {
                options.push({
                    label: "Translate",
                    onPress: async () => {
                        showToast("Translating...", 1500);

                        const translated = await freeTranslate(message.content, storage.targetLang);

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
