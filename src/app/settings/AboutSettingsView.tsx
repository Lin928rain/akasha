import { Anchor, Stack, Text } from "@mantine/core";
import React from "react";
import { useTranslation } from "react-i18next";

export default function AboutSettingsView() {
  const [t] = useTranslation();
  return (
    <Stack gap="xl" align="start">
      <Text size="sm">{t("settings.about.description")}</Text>
      <Anchor href="https://www.github.com/h16nning/super-anki">
        Link to Git Repository
      </Anchor>
    </Stack>
  );
}
