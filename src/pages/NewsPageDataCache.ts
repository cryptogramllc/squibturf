export let newsPageData: any[] = [];
export let newsPageLastKey: any = null;
export function setNewsPageData(data: any[], lastKey: any) {
  newsPageData = data;
  newsPageLastKey = lastKey;
}
export function clearNewsPageData() {
  newsPageData = [];
  newsPageLastKey = null;
}
