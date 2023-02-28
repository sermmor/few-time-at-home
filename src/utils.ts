const nameMonths: {[key: string]: number} = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11, };

export const parseFromNitterDateStringToDateObject = (dateString : string): Date => {
    // Example date: 'Tue, 28 Feb 2023 12:00:17 GMT'
    const dateSplited = dateString.split(' ');
    const hourSplited = dateSplited[4].split(':');
    return new Date(+dateSplited[3], nameMonths[dateSplited[2]], +dateSplited[1], +hourSplited[0], +hourSplited[1], +hourSplited[2]);
}

export const checkUntilConditionIsTrue = (predicate: () => boolean, doWhenConditionIsTrue: () => void, timeToWait: number = 100) => {
    setTimeout(() => (predicate() ? doWhenConditionIsTrue() : checkUntilConditionIsTrue(predicate, doWhenConditionIsTrue, timeToWait)), timeToWait);
}