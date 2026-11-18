-- BigQuery Standard SQL. Replace the GA4 dataset and reporting dates.
DECLARE report_start DATE DEFAULT DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY);
DECLARE report_end DATE DEFAULT DATE_SUB(CURRENT_DATE(), INTERVAL 4 DAY);

WITH samples AS (
  SELECT
    device.category AS device,
    event_timestamp,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "page_type") AS page_type,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "vital_name") AS metric,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = "vital_id") AS metric_id,
    (SELECT COALESCE(value.double_value, value.float_value, CAST(value.int_value AS FLOAT64))
      FROM UNNEST(event_params) WHERE key = "vital_value") AS value
  FROM `YOUR_PROJECT.analytics_123456789.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', report_start) AND FORMAT_DATE('%Y%m%d', report_end)
    AND event_name = "web_vital"
),
deduped AS (
  SELECT page_type, device, metric, value
  FROM samples
  WHERE metric_id IS NOT NULL AND value IS NOT NULL
  QUALIFY ROW_NUMBER() OVER (PARTITION BY metric, metric_id ORDER BY event_timestamp DESC) = 1
)
SELECT
  page_type, device, metric,
  COUNT(*) AS samples,
  APPROX_QUANTILES(value, 100)[OFFSET(75)] AS p75
FROM deduped
GROUP BY page_type, device, metric
ORDER BY page_type, device, metric;
