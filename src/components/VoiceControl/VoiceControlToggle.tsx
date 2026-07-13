/**
 * 语音控制开关按钮组件
 * 用于在学习界面中快速启用/禁用语音控制
 */

import { ActionIcon, Tooltip } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface VoiceControlToggleProps {
  isListening: boolean;
  isSupported: boolean;
  isEnabled: boolean;
  onToggle: () => void;
  error?: string | null;
}

export function VoiceControlToggle({
  isListening,
  isSupported,
  isEnabled,
  onToggle,
  error,
}: VoiceControlToggleProps) {
  const { t } = useTranslation();

  if (!isSupported) {
    return (
      <Tooltip
        label={t('learning.voice-not-supported')}
        position="bottom"
        withArrow
      >
        <ActionIcon
          variant="light"
          color="gray"
          size="lg"
          disabled
          aria-label={t('learning.voice-not-supported')}
        >
          <IconMicrophoneOff size={18} />
        </ActionIcon>
      </Tooltip>
    );
  }

  const tooltipLabel = error
    ? error
    : isListening
    ? t('learning.voice-listening')
    : t('learning.voice-disabled');

  return (
    <Tooltip label={tooltipLabel} position="bottom" withArrow>
      <ActionIcon
        variant={isListening ? 'filled' : 'light'}
        color={isListening ? 'green' : 'gray'}
        size="lg"
        onClick={onToggle}
        aria-label={
          isListening
            ? t('learning.voice-stop')
            : t('learning.voice-start')
        }
        disabled={!!error}
      >
        {isListening ? <IconMicrophone size={18} /> : <IconMicrophoneOff size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
