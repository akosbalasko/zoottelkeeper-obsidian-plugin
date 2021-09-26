import { SortOrder } from './../models';
import {
    ZOOTTELKEEPER_INDEX_LIST_BEGINNING_TEXT,
    ZOOTTELKEEPER_INDEX_LIST_END_TEXT
} from './../consts'

export const updateIndexContent = (sortOrder: SortOrder, currentContent: string, indexContent: Array<string>): string => {
    
    
    const intro = currentContent.split(ZOOTTELKEEPER_INDEX_LIST_BEGINNING_TEXT)[0];
    const outro = currentContent.split(ZOOTTELKEEPER_INDEX_LIST_END_TEXT);	

    indexContent = indexContent.sort(function (a, b) {
        return a.localeCompare(b);
      });
    if(sortOrder === SortOrder.DESC)
      indexContent.reverse();
    const content =   (currentContent === intro || currentContent === outro[0])
    ? `${ZOOTTELKEEPER_INDEX_LIST_BEGINNING_TEXT}\n${indexContent.join('\n')}\n${ZOOTTELKEEPER_INDEX_LIST_END_TEXT}\n`
    : `${intro}${ZOOTTELKEEPER_INDEX_LIST_BEGINNING_TEXT}\n${indexContent.join('\n')}\n${ZOOTTELKEEPER_INDEX_LIST_END_TEXT}${outro[1]}`
    return content;

}

