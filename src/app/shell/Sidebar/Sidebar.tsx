import { getCurrentSession, signOut } from "@/logic/auth";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Image,
  Menu,
  NavLink,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBolt,
  IconCards,
  IconChartBar,
  IconHome,
  IconKey,
  IconLogout,
  IconSearch,
  IconSettings,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import cx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import classes from "./Sidebar.module.css";

import ChangePasswordModal from "../../settings/ChangePasswordModal";
import DeckList from "./DeckList";

const InteractiveNavLink = ({
  label,
  path,
  icon,
  minimalMode,
  fullscreenMode,
  closeMenu,
}: {
  label: string;
  path: string;
  icon: JSX.Element;
  minimalMode: boolean;
  fullscreenMode: boolean;
  closeMenu: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Tooltip
      label={label}
      disabled={!minimalMode || fullscreenMode}
      position="right"
      keepMounted={false}
    >
      <NavLink
        classNames={{
          root: classes.sidebarItem,
          body: classes.sidebarItemBody,
          label: classes.sidebarItemLabel,
          section: classes.sidebarItemIcon,
        }}
        variant="filled"
        label={label}
        leftSection={icon}
        onClick={() => {
          navigate(path);
          fullscreenMode && closeMenu();
        }}
        active={location.pathname.startsWith(path)}
      />
    </Tooltip>
  );
};

function Sidebar({
  menuOpened,
  menuHandlers,
}: {
  menuOpened: boolean;
  menuHandlers: {
    readonly open: () => void;
    readonly close: () => void;
    readonly toggle: () => void;
  };
}) {
  const [t] = useTranslation();
  const theme = useMantineTheme();
  const routeIsLearn = useLocation().pathname.includes("learn");
  const fullscreenMode =
    !!useMediaQuery("(max-width: " + theme.breakpoints.xs + ")") ||
    routeIsLearn;
  const minimalMode = !!useMediaQuery(
    "(max-width: " +
      theme.breakpoints.lg +
      ") and (min-width: " +
      theme.breakpoints.xs +
      ")"
  );
  const [accountEmail, setAccountEmail] = useState<string>("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [passwordModalOpened, setPasswordModalOpened] = useState(false);

  const landscapeMode = useMediaQuery("(orientation: landscape)");

  useEffect(() => {
    getCurrentSession()
      .then((session) => {
        setAccountEmail(session?.user.email ?? "");
      })
      .catch(() => {
        setAccountEmail("");
      });
  }, []);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await signOut();
    } finally {
      setLogoutLoading(false);
    }
  }

  return (
    <>
      <Box
        className={cx(
          classes.sidebar,
          minimalMode && classes.minimalMode,
          landscapeMode && classes.landscapeMode,
          fullscreenMode && classes.fullscreenMode,
          fullscreenMode && menuOpened && classes.fullscreenModeOpened
        )}
      >
        <div className={classes.topRow}>
          <Group gap="xs" align="center">
            <Image src="/logo.png" alt="Akasha Logo" maw="1.5rem" />
            <Title order={5}>Akasha</Title>
          </Group>
          {fullscreenMode ? (
            <ActionIcon
              onClick={menuHandlers.close}
              style={{ alignSelf: "end" }}
              variant="subtle"
            >
              <IconX />
            </ActionIcon>
          ) : null}
        </div>
        {minimalMode ? (
          <div className={classes.minimalModeLogo}>
            <Image src="/logo.png" alt="Akasha Logo" />
          </div>
        ) : null}

        <div className={classes.scrollableArea}>
          <Stack gap={0}>
            <InteractiveNavLink
              label={t("sidebar.search")}
              path="/search"
              icon={<IconSearch />}
              minimalMode={minimalMode}
              fullscreenMode={fullscreenMode}
              closeMenu={menuHandlers.close}
            />
            <InteractiveNavLink
              label={t("home.title")}
              path="/home"
              icon={<IconHome />}
              minimalMode={minimalMode}
              fullscreenMode={fullscreenMode}
              closeMenu={menuHandlers.close}
            />
            <InteractiveNavLink
              label={t("today.title")}
              path="/today"
              icon={<IconBolt />}
              minimalMode={minimalMode}
              fullscreenMode={fullscreenMode}
              closeMenu={menuHandlers.close}
            />
            <InteractiveNavLink
              label={t("statistics.title")}
              path="/stats"
              icon={<IconChartBar />}
              minimalMode={minimalMode}
              fullscreenMode={fullscreenMode}
              closeMenu={menuHandlers.close}
            />

            <InteractiveNavLink
              label={t("manage-cards.title")}
              path="/notes"
              icon={<IconCards />}
              minimalMode={minimalMode}
              fullscreenMode={fullscreenMode}
              closeMenu={menuHandlers.close}
            />
            <InteractiveNavLink
              label={t("settings.title")}
              path="/settings"
              icon={<IconSettings />}
              minimalMode={minimalMode}
              fullscreenMode={fullscreenMode}
              closeMenu={menuHandlers.close}
            />
          </Stack>
          <DeckList minimalMode={minimalMode} />
        </div>
        <Stack gap="xs" className={classes.accountSection}>
            <Divider />
            {minimalMode ? (
              <Menu
                shadow="md"
                width={220}
                position="right-end"
                withArrow={true}
              >
                <Menu.Target>
                  <Tooltip label="Account" position="right" keepMounted={false}>
                    <ActionIcon variant="subtle" size="lg">
                      <IconUserCircle size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>{t("sidebar.account-label")}</Menu.Label>
                  <Menu.Item disabled={true}>
                    <Text size="xs" truncate="end">
                      {accountEmail || "Signed in"}
                    </Text>
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="blue"
                    leftSection={<IconKey size={14} />}
                    onClick={() => setPasswordModalOpened(true)}
                  >
                    {t("settings.account.password.title")}
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={14} />}
                    onClick={handleLogout}
                  >
                    Sign out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <>
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  <IconUserCircle
                    size={20}
                    style={{ flexShrink: 0, marginTop: "0.5rem" }}
                  />
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        {t("sidebar.account-label")}
                      </Text>
                      <Text size="sm" truncate="end">
                        {accountEmail || "Signed in"}
                      </Text>
                    </Stack>
                    <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
                      <Button
                        variant="light"
                        size="compact-sm"
                        leftSection={<IconKey size={16} />}
                        onClick={() => setPasswordModalOpened(true)}
                        justify="flex-start"
                        style={{ flex: 1 }}
                      >
                        {t("settings.account.password.title")}
                      </Button>
                      <Button
                        variant="light"
                        size="compact-sm"
                        leftSection={<IconLogout size={16} />}
                        onClick={handleLogout}
                        loading={logoutLoading}
                        justify="flex-start"
                        style={{ flex: 1 }}
                      >
                        {t("sidebar.logout-action")}
                      </Button>
                    </Group>
                  </Stack>
                </Group>
              </>
            )}
        </Stack>
        </Box>
      <ChangePasswordModal
        opened={passwordModalOpened}
        onClose={() => setPasswordModalOpened(false)}
      />
    </>
  );
}

export default Sidebar;
