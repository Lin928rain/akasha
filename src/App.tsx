import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/spotlight/styles.css";
import "mantine-datatable/styles.css";
import "./style/index.css";

import classes from "./App.module.css";
import {
  createCssVariablesResolver,
  createThemeFromColor,
  presetTheme,
} from "./style/StyleProvider";

import {
  AppShell,
  Center,
  Loader,
  MantineProvider,
  Stack,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import AuthView from "./app/auth/AuthView";
import Header from "./app/shell/Header/Header";
import Sidebar from "./app/shell/Sidebar/Sidebar";
import i18n from "./i18n";
import { Session, getCurrentSession, onAuthStateChange } from "./logic/auth";
import { useSetting } from "./logic/settings/hooks/useSetting";
import { getLocalSetting } from "./logic/settings/localSettings";

function useRestoreLanguage() {
  const [language] = useSetting("language");
  useEffect(() => {
    console.log("[i18n] setting language from settings:", language);
    i18n.changeLanguage(language);
    console.log("[i18n] current language:", i18n.language);
    console.log(
      "[i18n] zh settings.title:",
      i18n.getResource("zh", "translation", "settings.title")
    );
    console.log(
      "[i18n] en settings.title:",
      i18n.getResource("en", "translation", "settings.title")
    );
  }, [language]);

  return language;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // 获取用户设置的主题颜色，用于加载动画
  const themeColor = getLocalSetting("themeColor") || "#1e752f";

  useEffect(() => {
    let active = true;

    getCurrentSession()
      .then((current) => {
        if (!active) {
          return;
        }
        setSession(current);
        setAuthLoaded(true);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSession(null);
        setAuthLoaded(true);
      });

    const unsubscribe = onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoaded(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {authLoaded ? (
        session ? (
          <AuthenticatedApp />
        ) : (
          <UnauthenticatedApp />
        )
      ) : (
        <MantineProvider
          cssVariablesResolver={createCssVariablesResolver(themeColor)}
          theme={presetTheme}
        >
          <Center h="100dvh">
            <Loader />
          </Center>
        </MantineProvider>
      )}
    </I18nextProvider>
  );
}

function UnauthenticatedApp() {
  const [themeColor] = useSetting("themeColor");
  const theme = createThemeFromColor(themeColor);
  const cssResolver = createCssVariablesResolver(themeColor);

  return (
    <MantineProvider cssVariablesResolver={cssResolver} theme={theme}>
      <Notifications
        transitionDuration={400}
        containerWidth="20rem"
        position="bottom-center"
        autoClose={2000}
        limit={1}
      />
      <AuthView />
    </MantineProvider>
  );
}

function AuthenticatedApp() {
  const [colorSchemePreference] = useSetting("colorSchemePreference");
  const [themeColor] = useSetting("themeColor");
  useRestoreLanguage();
  const [sidebarMenuOpened, sidebarhandlers] = useDisclosure(false);
  const isDesktopLayout = useMediaQuery("(min-width: 36em)");

  const routeIsLearn = useLocation().pathname.includes("learn");
  useEffect(() => {
    if (routeIsLearn) {
      sidebarhandlers.close();
    } else {
      sidebarhandlers.open();
    }
  }, [routeIsLearn]);

  useEffect(() => {
    if (isDesktopLayout) {
      sidebarhandlers.open();
    }
  }, [isDesktopLayout]);

  const theme = createThemeFromColor(themeColor);
  const cssResolver = createCssVariablesResolver(themeColor);

  return (
    <MantineProvider
      defaultColorScheme={colorSchemePreference}
      cssVariablesResolver={cssResolver}
      theme={theme}
    >
      <Notifications
        transitionDuration={400}
        containerWidth="20rem"
        position="bottom-center"
        autoClose={2000}
        limit={1}
      />
      <AppShell
        layout="alt"
        navbar={{
          width: { xs: "3.5rem", lg: 300 },
          breakpoint: "xs",
          collapsed: {
            mobile: !sidebarMenuOpened,
            desktop: !sidebarMenuOpened,
          },
        }}
        header={{ height: "calc(60px + var(--safe-area-inset-top))" }}
      >
        <Header menuOpened={sidebarMenuOpened} menuHandlers={sidebarhandlers} />
        <AppShell.Navbar>
          <Sidebar
            menuOpened={sidebarMenuOpened}
            menuHandlers={sidebarhandlers}
          />
        </AppShell.Navbar>

        <AppShell.Main>
          <Stack h="100%">
            <Center className={classes.main} p="md" h="100%" mih={0}>
              <Outlet />
            </Center>
          </Stack>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
