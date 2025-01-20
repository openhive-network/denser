import { Page } from '@playwright/test';
import * as fs from 'fs';

export class IndexedDBHelper {
    readonly page: Page;

    constructor (page: Page) {
      this.page = page;
    }

    // Save indexedDB data into a file
    async saveIndexedDBIntoFile(indexedDBFile: string) {
        const indexedDBData = await this.page.evaluate(async () => {
            const dbs = await window.indexedDB.databases();
            const dbPromises = dbs.map((db) => {
            return new Promise((resolve) => {
                const request = window.indexedDB.open(db.name);
                request.onsuccess = (event) => {
                const dbInstance = event.target.result;
                const tx = dbInstance.transaction(dbInstance.objectStoreNames, 'readonly');
                const allData = {};
                tx.oncomplete = () => resolve({ name: db.name, data: allData });
                Array.from(dbInstance.objectStoreNames).forEach((storeName) => {
                    const store = tx.objectStore(storeName);
                    const storeData = [];
                    store.openCursor().onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        storeData.push(cursor.value);
                        cursor.continue();
                    } else {
                        allData[storeName] = storeData;
                    }
                    };
                });
                };
            });
            });

            const dbResults = await Promise.all(dbPromises);
            return dbResults;
        });

        await fs.writeFileSync(indexedDBFile, JSON.stringify(indexedDBData));
    }

    // Load date from the file to the indexedDB
    async loadIndexedDBData(dataIndexDBFile: string) {
        const indexedDBData = JSON.parse(fs.readFileSync(dataIndexDBFile, 'utf-8'));

        await this.page.evaluate(async (indexedDBData1) => {
            await Promise.all(indexedDBData1.map((db) => {
            return new Promise((resolve) => {
                const request = window.indexedDB.open(db.name);
                request.onsuccess = (event) => {
                const dbInstance = event.target.result;
                const tx = dbInstance.transaction(dbInstance.objectStoreNames, 'readwrite');
                tx.oncomplete = () => resolve();
                db.data.forEach((storeData, storeName) => {
                    const store = tx.objectStore(storeName);
                    storeData.forEach((item) => store.put(item));
                });
                };
            });
            }));
        }, indexedDBData);
    }
}
