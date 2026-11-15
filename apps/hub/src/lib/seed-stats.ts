// Real figures, read from HighLevel's statistics on 15 November 2026 (read-only).
// Social: Sunday 8 to Saturday 14 November 2026, compared with the seven days before.
// Email: each campaign's own totals at the time of reading (11 November 2026).

import type { EmailStats, SocialStats } from "./types";

export const SEED_SOCIAL_STATS: SocialStats = {
  "start": "2026-11-08",
  "end": "2026-11-14",
  "days": [
    "Sun 8",
    "Mon 9",
    "Tue 10",
    "Wed 11",
    "Thu 12",
    "Fri 13",
    "Sat 14"
  ],
  "totals": {
    "posts": 75,
    "impressions": 132557,
    "reach": 10050,
    "likes": 22214,
    "comments": 384,
    "shares": 810,
    "followers": 221
  },
  "change": {
    "posts": 294.74,
    "impressions": 391.02,
    "reach": 97.56
  },
  "daily": {
    "impressions": [
      2804,
      5976,
      7819,
      11886,
      60740,
      40932,
      2400
    ],
    "likes": [
      113,
      6023,
      530,
      457,
      8990,
      6025,
      76
    ],
    "comments": [
      6,
      126,
      80,
      44,
      70,
      40,
      18
    ]
  },
  "platforms": [
    {
      "platform": "facebook",
      "posts": 33,
      "impressions": 3870,
      "reach": 1785,
      "likes": 209,
      "comments": 61,
      "shares": 34,
      "followers": 99,
      "impressionsChange": 155.11,
      "reachChange": 161.35,
      "engagementChange": 353.73
    },
    {
      "platform": "instagram",
      "posts": 26,
      "impressions": 127239,
      "reach": 7978,
      "likes": 21941,
      "comments": 315,
      "shares": 769,
      "followers": 104,
      "impressionsChange": 411.55,
      "reachChange": 90.41,
      "engagementChange": 1344.48
    },
    {
      "platform": "linkedin",
      "posts": 9,
      "impressions": 798,
      "reach": 287,
      "likes": 46,
      "comments": 7,
      "shares": 6,
      "followers": 12,
      "impressionsChange": 89.1,
      "reachChange": 34.11,
      "engagementChange": 40.48
    },
    {
      "platform": "tiktok",
      "posts": 3,
      "impressions": 650,
      "reach": null,
      "likes": 18,
      "comments": 1,
      "shares": 1,
      "followers": 6,
      "impressionsChange": 253.26,
      "reachChange": null,
      "engagementChange": 1900
    },
    {
      "platform": "pinterest",
      "posts": 4,
      "impressions": 0,
      "reach": null,
      "likes": 0,
      "comments": 0,
      "shares": 0,
      "followers": 0,
      "impressionsChange": 0,
      "reachChange": null,
      "engagementChange": 0
    }
  ],
  "audience": {
    "gender": [
      [
        "male",
        179
      ],
      [
        "female",
        415
      ],
      [
        "unknown",
        152
      ]
    ],
    "age": [
      [
        "13-17",
        8
      ],
      [
        "18-24",
        31
      ],
      [
        "25-34",
        132
      ],
      [
        "35-44",
        171
      ],
      [
        "45-54",
        200
      ],
      [
        "55-64",
        143
      ],
      [
        "65+",
        61
      ]
    ]
  }
};

export const SEED_EMAIL_STATS: Record<string, EmailStats> = {
  "6af3614f6be94bd98788524b": { sent: 118, delivered: 118, opened: 3, clicked: 1, unsubscribed: 0, openRate: 2.54, clickRate: 0.85, bounceRate: 0 },
  "6af35b543f62ac8f7f345150": { sent: 155, delivered: 149, opened: 33, clicked: 1, unsubscribed: 2, openRate: 22.15, clickRate: 0.67, bounceRate: 3.87 },
  "6af35b476be94bd987875817": { sent: 412, delivered: 412, opened: 30, clicked: 7, unsubscribed: 0, openRate: 7.28, clickRate: 1.7, bounceRate: 0 },
  "6af352a2336730c93f05be82": { sent: 571, delivered: 548, opened: 148, clicked: 18, unsubscribed: 2, openRate: 27.01, clickRate: 3.28, bounceRate: 4.03 },
  "6af221bf3ae453d49e8c07b8": { sent: 92, delivered: 92, opened: 15, clicked: 0, unsubscribed: 0, openRate: 16.3, clickRate: 0, bounceRate: 0 },
  "6af21e1675dbbf86153e4af7": { sent: 163, delivered: 150, opened: 67, clicked: 3, unsubscribed: 1, openRate: 44.67, clickRate: 2, bounceRate: 7.41 },
  "6af206438672a79fd96b1d30": { sent: 552, delivered: 532, opened: 185, clicked: 36, unsubscribed: 4, openRate: 34.77, clickRate: 6.77, bounceRate: 3.62 },
};
