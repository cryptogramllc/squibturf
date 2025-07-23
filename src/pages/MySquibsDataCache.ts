export let mySquibsData: any[] = [];
export let mySquibsLastKey: any = null;
export function setMySquibsData(data: any[], lastKey: any) {
  mySquibsData = data;
  mySquibsLastKey = lastKey;
}
export function clearMySquibsData() {
  mySquibsData = [];
  mySquibsLastKey = null;
}
