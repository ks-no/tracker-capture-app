import {
    INNREISE_AVREISELAND_DATA_ELEMENT_ID, INNREISE_KARANTENE_ALTERNATIV_CODE_ID,
    INNREISE_KARANTENE_ALTERNATIV_TEXT_ID,
    INNREISE_KARANTENE_GJENOMFORING_TYPE_CODE_ID,
    INNREISE_KARANTENE_GJENOMFORING_TYPE_TEXT_ID,
    INNREISE_OPPFOLGINGSTATUS_ID, INNREISE_UNNTAK_TYPE_CODE_ID,
    INNREISE_UNNTAK_TYPE_TEXT_ID,
    INNREISEINFORMASJON_PROGRAM_STAGE_ID,
    STATUS_OPPFOLGNING_LOOKUP_ID, INNREISE_OPPHOLDSSTED_ID, INNREISE_ARBEIDSGIVER_NAVN_ID
} from "../utils/constants";
import {addEventDataToServerResponse} from "./add_event_data_to_server_response";
import {convertDatestringToDDMMYYYY} from "../utils/converters";

export function addEventDataToInnreiseList(scope, serverResponse, teiAccessApiService, metaDataFactory) {

    var eventDataElementStructArray = [
        {eventId: INNREISEINFORMASJON_PROGRAM_STAGE_ID,
            dataFields: [
                {
                    dataFieldId: INNREISE_AVREISELAND_DATA_ELEMENT_ID,
                    dataFieldName: 'Avreiseland'
                },
                {
                    dataFieldId: INNREISE_OPPFOLGINGSTATUS_ID,
                    dataFieldName: 'Oppfolgingstatus',
                    lookupId: STATUS_OPPFOLGNING_LOOKUP_ID
                },
                {
                    dataFieldId: INNREISE_KARANTENE_ALTERNATIV_TEXT_ID,
                    dataFieldName: 'Karantenetype_tekst',
                },
                {
                    dataFieldId: INNREISE_KARANTENE_ALTERNATIV_CODE_ID,
                    dataFieldName: 'Karantenetype_kode'
                },
                {
                    dataFieldId: INNREISE_KARANTENE_ALTERNATIV_CODE_ID,
                    dataFieldName: 'Karantenetype_tekst_short',
                    lookupId: karantenekodeToShortTekst
                },
                {
                    dataFieldId: INNREISE_UNNTAK_TYPE_CODE_ID,
                    dataFieldName: 'Unntaktype_kode',
                },
                {
                    dataFieldId: INNREISE_UNNTAK_TYPE_TEXT_ID,
                    dataFieldName: 'Unntaktype_tekst',

                },
                {
                    dataFieldId: INNREISE_KARANTENE_GJENOMFORING_TYPE_CODE_ID,
                    dataFieldName: 'Gjennomforingstype_kode',
                },
                {
                    dataFieldId: INNREISE_KARANTENE_GJENOMFORING_TYPE_TEXT_ID,
                    dataFieldName: 'Gjennomforingstype_tekst',
                },
                {
                    dataFieldId: INNREISE_OPPHOLDSSTED_ID,
                    dataFieldName: 'Oppholdsted',
                },
                {
                    dataFieldId: INNREISE_ARBEIDSGIVER_NAVN_ID,
                    dataFieldName: 'Arbeidsgivernavn',
                },
                {
                    dataFieldId: 'eventDate',
                    dataFieldName: 'Innreisedato',
                    converter: convertDatestringToDDMMYYYY
                }
                ]
        }
    ];

    addEventDataToServerResponse(eventDataElementStructArray, scope, serverResponse, teiAccessApiService, metaDataFactory);

}

function karantenekodeToShortTekst(kode) {
    if (kode === '1001') {
        return 'Karantene';
    }

    if (kode === '1002') {
        return 'Unntatt karantene';
    }

    return kode;
}