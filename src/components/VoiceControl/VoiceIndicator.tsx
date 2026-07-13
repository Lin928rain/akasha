/**
 * 语音识别状态指示器组件
 * 显示当前语音识别状态和识别到的文本
 */

import { Box, Text, Badge, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';

interface VoiceIndicatorProps {
  isListening: boolean;
  transcript: string;
  confidence: number;
  commandCount: number;
}

export function VoiceIndicator({
  isListening,
  transcript,
  confidence,
  commandCount,
}: VoiceIndicatorProps) {
  const { t } = useTranslation();

  if (!isListening && !transcript) {
    return null;
  }

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.5) return 'yellow';
    return 'red';
  };

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 100,
        right: 20,
        zIndex: 1000,
        maxWidth: 300,
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <Badge
          color={isListening ? 'green' : 'gray'}
          variant="filled"
          size="sm"
          leftSection={
            isListening ? (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                  animation: 'pulse 1s infinite',
                }}
              />
            ) : null
          }
        >
          {isListening ? t('learning.voice-listening') : t('learning.voice-disabled')}
        </Badge>
        {confidence > 0 && (
          <Badge color={getConfidenceColor()} variant="light" size="sm">
            {(confidence * 100).toFixed(0)}%
          </Badge>
        )}
      </Group>
      {transcript && (
        <Text size="xs" c="dimmed" mt="xs" lineClamp={2}>
          "{transcript}"
        </Text>
      )}
      {commandCount > 0 && (
        <Text size="xs" c="dimmed" mt="xs">
          {t('learning.voice-commands-executed', { count: commandCount })}
        </Text>
      )}
    </Box>
  );
}
