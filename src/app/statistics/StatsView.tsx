import { useDecks } from "@/logic/deck/hooks/useDecks";
import {
  ReviewSummaryRow,
  getCardStateSummary,
  getReviewSummary,
} from "@/logic/statistics";
import { BarChart, DonutChart } from "@mantine/charts";
import { Center, SegmentedControl, Stack, Title } from "@mantine/core";
import { useDocumentTitle } from "@mantine/hooks";
import { State } from "fsrs.js";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import SelectDecksHeader from "../../components/SelectDecksHeader";
import { AppHeaderContent } from "../shell/Header/Header";

function StatsView() {
  const [t] = useTranslation();
  useDocumentTitle(`${t("statistics.title")} | Akasha`);
  const [decks] = useDecks();
  const navigate = useNavigate();

  const [timeFrame, setTimeFrame] = useState<"week" | "month" | "year">(
    "month"
  );
  const deckId = useParams().deckId;

  const [reviewData, setReviewData] = useState<ReviewSummaryRow[]>([]);

  useEffect(() => {
    const days = timeFrame === "week" ? 7 : timeFrame === "month" ? 30 : 365;
    getReviewSummary({ deckId, days }).then((rows) => {
      setReviewData(rows);
    });
  }, [timeFrame, deckId]);

  const [cardStateData, setCardStateData] = useState<
    { name: string; value: number; color: string }[]
  >([]);

  useEffect(() => {
    getCardStateSummary(deckId).then((summary) => {
      setCardStateData([
        {
          name: t("deck.new-cards-label"),
          value: summary.new,
          color: "grape.6",
        },
        {
          name: t("deck.learning-cards-label"),
          value: summary.learning,
          color: "orange.6",
        },
        {
          name: t("deck.review-cards-label"),
          value: summary.review,
          color: "blue.6",
        },
        {
          name: t("statistics.not-due"),
          value: summary.notDue,
          color: "gray.6",
        },
      ]);
    });
  }, [deckId, t]);

  return (
    <>
      <AppHeaderContent>
        <Center>
          <Title order={3}>{t("statistics.title")}</Title>
        </Center>
      </AppHeaderContent>

      <Stack w="100%" maw="600px" gap="xl">
        <SelectDecksHeader
          label={t("statistics.showing-of")}
          decks={decks}
          onSelect={(deckId) => navigate(`/stats/${deckId}`)}
        />

        <Stack gap="xs">
          <SegmentedControl
            data={[
              { value: "week", label: t("statistics.week") },
              { value: "month", label: t("statistics.month") },
              { value: "year", label: t("statistics.year") },
            ]}
            size="xs"
            value={timeFrame}
            onChange={(value) =>
              setTimeFrame(value as "week" | "month" | "year")
            }
          />
          <BarChart
            h={500}
            data={reviewData}
            dataKey="day"
            type="stacked"
            withLegend
            xAxisProps={{
              reversed: true,
            }}
            series={[
              {
                name: State.Review.toString(),
                label: t("deck.review-cards-label"),
                color: "blue.6",
              },
              {
                name: State.Learning.toString(),
                label: t("deck.learning-cards-label"),
                color: "orange.6",
              },
              {
                name: State.New.toString(),
                label: t("deck.new-cards-label"),
                color: "grape.6",
              },
            ]}
            tickLine="y"
          />
        </Stack>
        <DonutChart
          size={160}
          data={cardStateData}
          withLabels
          tooltipDataSource="segment"
        />
      </Stack>
    </>
  );
}

export default StatsView;
