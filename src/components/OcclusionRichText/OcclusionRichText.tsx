import { UnstyledButton } from "@mantine/core";
import cx from "clsx";
import parse, {
  type DOMNode,
  Element,
  type HTMLReactParserOptions,
  domToReact,
} from "html-react-parser";
import { type ReactNode, memo, useState } from "react";
import { useTranslation } from "react-i18next";

import classes from "./OcclusionRichText.module.css";

export interface OcclusionRichTextProps {
  html: string;
  controlledIsVisible?: boolean;
  className?: string;
}

export const OcclusionRichText = memo(
  ({ html, controlledIsVisible, className }: OcclusionRichTextProps) => {
    const normalizedHtml = html
      .replace(/<\/p>\s*<p[^>]*>/gi, "<br />")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<\/p>/gi, "");

    const finalHtml = normalizedHtml.replace(
      /\{\{([\s\S]*?)\}\}/g,
      (_match, inner) =>
        `<span class="interactive-occlusion-field-replace">${inner.replace(
          /<\/p>\s*<p[^>]*>/gi,
          "<br />"
        )}</span>`
    );

    const options: HTMLReactParserOptions = {
      replace(domNode) {
        if (
          domNode instanceof Element &&
          domNode.attribs.class?.includes("interactive-occlusion-field-replace")
        ) {
          return (
            <OcclusionField controlledIsVisible={controlledIsVisible}>
              {domToReact(domNode.children as DOMNode[], options)}
            </OcclusionField>
          );
        }
      },
    };

    return <span className={className}>{parse(finalHtml, options)}</span>;
  }
);

function OcclusionField({
  children,
  controlledIsVisible,
}: {
  children: ReactNode;
  controlledIsVisible?: boolean;
}) {
  const [t] = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const isControlled = controlledIsVisible !== undefined;
  const visible = isControlled ? controlledIsVisible : isVisible;

  return (
    <UnstyledButton
      type="button"
      className={cx(classes.occlusionBlock, {
        [classes.occlusionBlockHidden]: !visible,
        [classes.occlusionBlockRevealed]: visible,
      })}
      data-occlusion-hidden={!visible}
      onClick={() => {
        if (!isControlled) setIsVisible((prev) => !prev);
      }}
    >
      {!visible ? (
        <span className={classes.occlusionHint} data-occlusion-hint="true">
          {t("image-occlusion.click-to-reveal")}
        </span>
      ) : (
        <span className={classes.revealedText}>{children}</span>
      )}
    </UnstyledButton>
  );
}
