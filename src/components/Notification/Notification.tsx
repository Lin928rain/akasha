import { notifications } from "@mantine/notifications";
import {
  IconArrowsExchange,
  IconCheck,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { t } from "i18next";
import React from "react";
import classes from "./Notification.module.css";

export function successfullySaved() {
  return notifications.show({
    title: t("notification.saved"),
    message: t("notification.saved-message"),
    color: "green",
    withCloseButton: false,
    icon: <IconCheck />,
    className: classes,
  });
}

export function successfullyAdded() {
  return notifications.show({
    title: t("notification.added"),
    message: t("notification.added-message"),
    autoClose: 1000,
    color: "teal",
    withCloseButton: false,
    icon: <IconCheck />,
    className: classes,
  });
}

export function successfullyMovedCardTo(deckName: string) {
  return notifications.show({
    title: t("notification.moved-card"),
    message: t("notification.moved-card-message", { deckName }),
    autoClose: 1000,
    color: "teal",
    withCloseButton: false,
    icon: <IconArrowsExchange />,
    className: classes,
  });
}

export function successfullyMovedNoteTo(deckName: string) {
  return notifications.show({
    title: t("notification.moved-note"),
    message: t("notification.moved-note-message", { deckName }),
    autoClose: 1000,
    color: "teal",
    withCloseButton: false,
    icon: <IconArrowsExchange />,
    className: classes,
  });
}

export function successfullyMovedDeckTo(deckName: string) {
  return notifications.show({
    title: t("notification.moved-deck"),
    message: t("notification.moved-deck-message", { deckName }),
    autoClose: 1000,
    color: "teal",
    withCloseButton: false,
    icon: <IconArrowsExchange />,
    className: classes,
  });
}

export function successfullyDeleted(type: "card" | "deck" | "note") {
  const titles = {
    card: t("notification.deleted-card"),
    deck: t("notification.deleted-deck"),
    note: t("notification.deleted-note"),
  };
  return notifications.show({
    title: titles[type],
    message: t("notification.deleted-message"),
    autoClose: 1000,
    color: "teal",
    withCloseButton: false,
    icon: <IconTrash />,
    className: classes,
  });
}

export function saveFailed() {
  return notifications.show({
    title: t("notification.error"),
    message: t("notification.save-failed"),
    autoClose: 1500,
    color: "red",
    withCloseButton: false,
    icon: <IconX />,
    className: classes,
  });
}

export function addFailed() {
  return notifications.show({
    title: t("notification.error"),
    message: t("notification.add-failed"),
    autoClose: 1500,
    color: "red",
    withCloseButton: false,
    icon: <IconX />,
    className: classes,
  });
}

export function deleteFailed(type: "card" | "deck" | "note") {
  const titles = {
    card: t("notification.delete-card-failed"),
    deck: t("notification.delete-deck-failed"),
    note: t("notification.delete-note-failed"),
  };
  return notifications.show({
    title: titles[type],
    message: t("notification.delete-failed-message"),
    autoClose: 1500,
    color: "red",
    withCloseButton: false,
    icon: <IconX />,
    className: classes,
  });
}

export function genericFail() {
  return notifications.show({
    title: t("notification.error"),
    message: t("notification.generic-fail"),
    autoClose: 1500,
    color: "red",
    withCloseButton: false,
    icon: <IconX />,
    className: classes,
  });
}

export function test() {
  return notifications.show({
    title: "Test",
    message: "This is a description",
    color: "teal",
    withCloseButton: false,
    icon: <IconCheck />,
    className: classes,
  });
}
