/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Anoop Raveendran
 */

import path from "path";
import { test } from '@playwright/test';

import { mergeHTMLReports } from "./merge-reports"; //'playwright-merge-html-reports';

console.log(`Projects: ${process.env.PROJECTS}`)
console.log(`Total number of shards: ${process.env.SHARD_TOTAL}`)
const projects = JSON.parse(process.env.PROJECTS || '[]');
const numberOfShards = parseInt(process.env.SHARD_TOTAL || '1')
const reportPaths: string[] = [];

for (let project of projects) {
    for (let shardNumber = 1; shardNumber <= numberOfShards; shardNumber++) {
        const reportPath = path.resolve(process.cwd(), 'playwright-report', project, String(shardNumber))
        reportPaths.push(reportPath);
    }
}

test('Merge Reports', async ({ page }) => {
  await mergeHTMLReports(reportPaths, { debug: false});
})
