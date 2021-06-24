
// Example of expected structure of eventDataElementStructArray
import {importEventToListAsync} from "./import_event_to_list";

var eventDataElementStructArrayTemplate = [
    {
        eventId: 'fdF34MN3r5',
        dataFields: [
            {
                dataFieldId: 'bg4D2MNfE4',
                dataFieldName: 'MyDataField',
                converter: (a) => 'Field: ' + a.toString(),
                lookupId: 'Bz4GG4mnF3'
            }
        ]
    }
    ];

export function addEventDataToServerResponse(eventDataElementStructArray, scope, serverResponse, teiAccessApiService, metaDataFactory) {
    var teis = extractTeis(serverResponse);

    metaDataFactory.getAll('optionSets').then(function (optionSets) {
        eventDataElementStructArray.forEach(eventDataElementStruct => {
            var eventId = eventDataElementStruct.eventId;
            var dataFields = eventDataElementStruct.dataFields;
            var dataValuesToExtract = dataFields.map(field => field.dataFieldId);
            importEventToListAsync(
                teis,
                scope.base.selectedProgram.id,
                eventId,
                scope.selectedOrgUnit.id,
                dataValuesToExtract,
                teiAccessApiService
            ).then(eventData => {
                dataFields.forEach(dataField => {
                    setHeader(serverResponse, dataField.dataFieldName);
                    var converter = dataField.converter ? dataField.converter : a => a;
                    if (dataField.lookupId) {
                        converter = status => converter(optionSetsDataLookup(optionSets, dataField.lookupId, status));
                    }
                    setDataValue(serverResponse, eventData, dataField.dataFieldId, converter);
                });
            });
        });
    });
}

function extractTeis(serverResponse) {
    var teis = [];
    serverResponse.rows.forEach(function (row) {
        teis.push(row[0]);
    });
    return teis;
}

function setHeader(serverResponse, headerName) {
    serverResponse.headers.push({
        name: headerName,
        column: headerName,
        hidden: false,
        meta: false,
        type: 'java.lang.String'
    });
}

function setDataValue(serverResponse, eventData, dataId, dataConverter = a => a) {
    serverResponse.rows.forEach(row => {
        var teiId = row[0];
        var dataValue;
        if(eventData && teiId && eventData[teiId] && dataId && eventData[teiId][dataId]) {
            dataValue = dataConverter(eventData[teiId][dataId]);
        } else {
            dataValue = undefined;
        }

        row.push(dataValue);
    });
}

function optionSetsDataLookup(optionSets, optionId, dataValue) {
    var optionLookup = optionSets.find(option => option.id === optionId);
    var lookedUpValue = optionLookup && optionLookup.options.find(option => option.code === dataValue);
    return lookedUpValue && lookedUpValue.displayName ? lookedUpValue.displayName : dataValue;
}