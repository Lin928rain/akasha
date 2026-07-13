import { useSetting } from "@/logic/settings/hooks/useSetting";
import { setSetting } from "@/logic/settings/setSetting";
import {
  Box,
  Center,
  ColorInput,
  Input,
  MantineColorScheme,
  SegmentedControl,
  Stack,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun, IconSunMoon } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { SettingsValues } from "../../logic/settings/Settings";

export default function SegmentedToggle() {
  const [t] = useTranslation();
  const [colorSchemePreference] = useSetting("colorSchemePreference");
  const [themeColor] = useSetting("themeColor");
  const { setColorScheme } = useMantineColorScheme();

  return (
    <Stack gap="xl">
      <Input.Wrapper
        label={t("settings.appearance.color-scheme")}
        description={t("settings.appearance.color-scheme-description")}
      >
        <SegmentedControl
          mt="xs"
          value={colorSchemePreference}
          onChange={(value) => {
            setSetting(
              "colorSchemePreference",
              (value as SettingsValues["colorSchemePreference"]) || "light"
            );
            setColorScheme((value as MantineColorScheme) || "auto");
          }}
          data={[
            {
              value: "light",
              label: (
                <Center>
                  <IconSun size={16} />
                  <Box fz="xs" fw={600} ml={10}>
                    {t("settings.appearance.color-scheme-light")}
                  </Box>
                </Center>
              ),
            },
            {
              value: "dark",
              label: (
                <Center>
                  <IconMoon size={16} />
                  <Box fz="xs" fw={600} ml={10}>
                    {t("settings.appearance.color-scheme-dark")}
                  </Box>
                </Center>
              ),
            },
            {
              value: "auto",
              label: (
                <Center>
                  <IconSunMoon size={16} />
                  <Box fz="xs" fw={600} ml={10}>
                    {t("settings.appearance.color-scheme-auto")}
                  </Box>
                </Center>
              ),
            },
          ]}
        />
      </Input.Wrapper>

      <ColorInput
        label={t("settings.appearance.theme-color")}
        description={t("settings.appearance.theme-color-description")}
        value={themeColor}
        onChange={(color) => setSetting("themeColor", color)}
        withEyeDropper
        format="hex"
      />
    </Stack>
  );
}
