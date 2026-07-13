import {
  Alert,
  Anchor,
  Button,
  Center,
  CheckIcon,
  Group,
  Image,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function WelcomeView() {
  const [t] = useTranslation();
  const [_, setRegistered] = useLocalStorage({
    key: "registered",
    defaultValue: false,
  });

  useEffect(() => {}, []);
  return (
    <Center py="4rem" px="0.5rem" w="100%">
      <Stack gap="2rem" maw="600px">
        <div style={{ position: "relative" }}>
          <Image
            src="logo.png"
            alt="Akasha Logo"
            maw="4rem"
            style={{
              position: "absolute",
              filter: "blur(20px)",
              opacity: 0.5,
              zIndex: -1,
            }}
          />
          <Image src="logo.png" alt="Akasha Logo" maw="4rem" />
        </div>
        <Stack gap="xs">
          <Title order={1}>{t("welcome.title")}</Title>
          <Text fz="sm">{t("welcome.subtitle")}</Text>
          {[
            t("welcome.feature-no-signup"),
            t("welcome.feature-free"),
            t("welcome.feature-browser"),
            t("welcome.feature-privacy"),
          ].map((item) => (
            <Group key={item} align="center" gap="xs">
              <CheckIcon
                style={{ color: "var(--mantine-color-green-strong)" }}
                size={12}
              />{" "}
              <Text fz="sm">{item}</Text>
            </Group>
          ))}
        </Stack>
        <Alert color="gray" icon={<IconInfoCircle />}>
          {t("welcome.beta-notice-part1")}{" "}
          <Anchor
            href="https://www.github.com/h16nning/akasha"
            fz="sm"
            style={{ whiteSpace: "nowrap" }}
          >
            {t("welcome.github-link")}
          </Anchor>
          {t("welcome.beta-notice-part2")}
        </Alert>
        <Stack gap="xs">
          <Title order={3}>{t("welcome.about-title")}</Title>
          <Text fz="sm">
            {t("welcome.about-description-part1")}{" "}
            <Anchor href="https://www.github.com/h16nning/akasha" fz="sm">
              {t("welcome.github-link")}
            </Anchor>
            {t("welcome.about-description-part2")}
          </Text>
        </Stack>
        <Stack gap="xs">
          <Title order={3}>{t("welcome.privacy-title")}</Title>
          <Text fz="sm">{t("welcome.privacy-description")}</Text>
        </Stack>
        <Group align="start">
          <Button
            onClick={() => setRegistered(true)}
            size="md"
            variant="gradient"
          >
            {t("welcome.get-started")}
          </Button>
        </Group>
      </Stack>
    </Center>
  );
}
