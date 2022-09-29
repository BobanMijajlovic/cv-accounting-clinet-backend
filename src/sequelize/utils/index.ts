/** Compare two dates without comparing times ( ONLY DATES ) */
export const compareTwoDates = (date1: string | Date, date2: string | Date) => {
    const _date1 = new Date(date1).setHours(0,0,0,0)
    const _date2 = new Date(date2).setHours(0,0,0,0)
    return _date1 === _date2
}