export class ImportStore {
  constructor() {
    this.items = [];
  }

  saveBatch(batchItems) {
    this.items = [...batchItems, ...this.items];
    return batchItems;
  }

  listItems() {
    return this.items;
  }
}
