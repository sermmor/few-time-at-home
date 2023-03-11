const nameMonths: {[key: string]: number} = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11, };

export const parseFromNitterDateStringToDateObject = (dateString : string): Date => {
    // Example date: 'Tue, 28 Feb 2023 12:00:17 GMT'
    const dateSplited = dateString.split(' ');
    const hourSplited = dateSplited[4].split(':');
    return new Date(+dateSplited[3], nameMonths[dateSplited[2]], +dateSplited[1], +hourSplited[0], +hourSplited[1], +hourSplited[2]);
}

export const parseFromBlogDateStringToDateObject = (dateString : string): Date => {
    // Example date: '2023-03-09T09:27:00.000Z'
    const dateSplited = dateString.split('T')[0].split('-');
    const hourSplited = dateString.split('T')[1].split(':');
    return new Date(+dateSplited[0], (+dateSplited[1]) - 1, +dateSplited[2], +hourSplited[0], +hourSplited[1], 0);
}

export const checkUntilConditionIsTrue = (predicate: () => boolean, doWhenConditionIsTrue: () => void, timeToWait: number = 100) => {
    setTimeout(() => (predicate() ? doWhenConditionIsTrue() : checkUntilConditionIsTrue(predicate, doWhenConditionIsTrue, timeToWait)), timeToWait);
}

export const removeDuplicatesInStringArray = (listWithDuplicatesOrNot: string[]): string[] => {
    const onlyNotDuplicates: string[] = [];
    listWithDuplicatesOrNot.forEach(element => {
        if (onlyNotDuplicates.indexOf(element) < 0) {
            onlyNotDuplicates.push(element);
        }
    });
    return onlyNotDuplicates;
}

export const removeDuplicates = <T>(listWithDuplicatesOrNot: T[], isEqual: (a: T, b: T) => boolean): T[] => {
    const onlyNotDuplicates: T[] = [];
    let finded: boolean;
    listWithDuplicatesOrNot.forEach(element => {
        finded = !!onlyNotDuplicates.find((value) => {
            for (let i = 0; i < listWithDuplicatesOrNot.length; i++) {
                if (isEqual(element, value)) {
                    return true;
                }
            }
            return false;
        });
        if (!finded) {
            onlyNotDuplicates.push(element);
        }
    });
    return onlyNotDuplicates;
}
