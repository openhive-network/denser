/**
 * Copyright (c) Microsoft Corporation.
 * Additions and modifications by Anoop Raveendran <https://github.com/anooprav7>
 * https://github.com/microsoft/playwright/blob/main/packages/playwright-test/src/reporters/html.ts
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { JSZipObject } from 'jszip';
import { z } from 'zod';
const locationSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number()
});
export type Location = z.infer<typeof locationSchema>;

const statsSchema = z.object({
  total: z.number(),
  expected: z.number(),
  unexpected: z.number(),
  flaky: z.number(),
  skipped: z.number(),
  ok: z.boolean(),
  duration: z.number()
});
export type Stats = z.infer<typeof statsSchema>;

const testCaseSummarySchema = z.object({
  fileId: z.string().optional(),
  title: z.string(),
  part: z.string().array().optional(),
  projectName: z.string(),
  location: locationSchema,
  annotations: z
    .object({
      type: z.string(),
      descripton: z.string().optional()
    })
    .array(),
  outcome: z.union([
    z.literal('skipped'),
    z.literal('expected'),
    z.literal('unexpected'),
    z.literal('flaky')
  ]),
  duration: z.number(),
  ok: z.boolean()
});

export type TestCaseSummary = z.infer<typeof testCaseSummarySchema>;
const testFileSummarySchema = z.object({
  fileId: z.string().optional(),
  fileName: z.string(),
  tests: testCaseSummarySchema.array(),
  stats: statsSchema
});
export type testFileSummary = z.infer<typeof testFileSummarySchema>;

export const HTMLReportSchema = z.object({
  files: testFileSummarySchema.array(),
  stats: statsSchema,
  projectNames: z.string().array()
});

export type HTMLReport = z.infer<typeof HTMLReportSchema>;

export type Config = {
  outputFolderName?: string;
  outputBasePath?: string;
  overwriteExisting?: boolean;
  debug?: boolean;
};

export type ZipDataFile = {
  relativePath: string;
  file: JSZipObject;
};

export interface FileReport {
  fileId: string;
  fileName: string;
  tests: TestsEntity[];
}

export interface TestsEntity {
  testId: string;
  title: string;
  projectName: string;
  location: Location;
  duration: number;
  annotations?: unknown[];
  outcome: string;
  path?: string[];
  results?: ResultsEntity[];
  ok: boolean;
}

export interface ResultsEntity {
  duration: number;
  startTime: string;
  retry: number;
  steps?: Step[];
  errors?: string[];
  status: string;
  attachments?: AttachmentsEntity[];
}

export interface Step {
  title: string;
  startTime: string;
  duration: number;
  steps?: Step[];
  count: number;
  snippet?: string;
  location?: Location;
  error?: string;
}

export interface AttachmentsEntity {
  name: string;
  contentType: string;
  path: string;
}
