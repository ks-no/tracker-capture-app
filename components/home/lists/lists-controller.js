import {
    DUPLIKAT_PROGRAM_ID,
    INDEKS_ALLE_TILDELTE_OPPGAVER,
    INDEKS_IKKE_TILDELTE_OPPGAVER, INDEKS_STATUS_ARBEIDSLISTE,
    INDEKSERING_PROGRAM_ID,
    INNREISE_ALLE_TILDELTE_OPPGAVER,
    INNREISE_IKKE_TILDELTE_OPPGAVER,
    INNREISE_PROGRAM_ID,
    NAERKONTAKT_ALLE_TILDELTE_OPPGAVER,
    NAERKONTAKT_IKKE_TILDELTE_OPPGAVER,
} from "../../../utils/constants";
import {convertDatestringToFullTime} from "../../../utils/converters";
import {addEventDataToInnreiseList} from "../../../ks_patches/add_event_data_to_innreise_list";
import {setCustomShowOnAttributesInList} from "../../../ks_patches/hide_show_attributes";
import {addIkkeTildeltToTildeltList, addTildeltToTildeltList} from "../../../ks_patches/add_tildelt_to_tidelt_list";
import {customPageSizeForProgram} from "../../../ks_patches/override_params";

var trackerCapture = angular.module('trackerCapture');

trackerCapture.controller('ListsController', function (
    $rootScope,
    $scope,
    $modal,
    $location,
    $filter,
    $timeout,
    $q,
    Paginator,
    MetaDataFactory,
    DateUtils,
    OrgUnitFactory,
    ProgramFactory,
    AttributesFactory,
    EntityQueryFactory,
    CurrentSelection,
    TEIGridService,
    TEIService,
    TeiAccessApiService,
    UserDataStoreService,
    ProgramWorkingListService,
    FNrLookupService,
    OperatorFactory,
    ModalService,
    $http,
    $cookies) {
    var ouModes = [{name: 'SELECTED'}, {name: 'CHILDREN'}, {name: 'DESCENDANTS'}, {name: 'ACCESSIBLE'}];
    var userGridColumns = null;
    var defaultCustomWorkingListValues = {ouMode: ouModes[0], programStatus: ""};
    var gridColumnsContainer = "trackerCaptureGridColumns";

    $scope.workingListTypes = {NORMAL: "NORMAL", CUSTOM: "CUSTOM"};
    $scope.trackedEntityListTypes = {WORKINGLIST: "WORKINGLIST", CUSTOM: "CUSTOM"};
    $scope.listExportFormats = ["XML", "JSON", "CSV"];
    $scope.customWorkingListValues = defaultCustomWorkingListValues;
    $scope.defaultOperators = OperatorFactory.defaultOperators;
    $scope.boolOperators = OperatorFactory.boolOperators;

    var initPager = function () {
        $scope.defaultRequestProps = {
            skipTotalPages: true
        };

        var pageSize = customPageSizeForProgram($scope.selectedProgram && $scope.selectedProgram.id) || 50;
        $scope.pager = {
            ...$scope.defaultRequestProps,
            pageSize: pageSize,
            page: 1
        };
    }
    initPager();

    $scope.$watch('base.selectedProgram', function () {
        init();
    });

    var init = function () {
        if (angular.isObject($scope.base.selectedProgram)) {
            initPager();
            reset();
            loadAttributesByProgram()
                .then(loadGridColumns)
                .then(loadWorkingLists)
                .then(loadCachedData)
                .then(setDefault);
        }
    }

    var reset = function () {
        $scope.customWorkingListValues = defaultCustomWorkingListValues;
        $scope.currentTrackedEntityList = null;
        $scope.gridColumns = null;
    }
    var resolvedEmptyPromise = function () {
        var deferred = $q.defer();
        deferred.resolve();
        return deferred.promise;
    }

    var loadGridColumns = function () {
        if ($scope.base.selectedProgram) {
            return UserDataStoreService.get(gridColumnsContainer, $scope.base.selectedProgram.id).then(function (savedGridColumns) {
                var gridColumnConfig = {defaultRange: {start: 3, end: 7}};

                $scope.gridColumns = TEIGridService.makeGridColumns($scope.programAttributes, gridColumnConfig, savedGridColumns);
                $scope.gridColumns = setCustomShowOnAttributesInList($scope.gridColumns, $scope.base.selectedProgram.id);
            });
        }
        return resolvedEmptyPromise();

    }


    var loadWorkingLists = function () {
        return ProgramWorkingListService.getWorkingListsForProgram($scope.base.selectedProgram).then(function (programWorkingLists) {
            $scope.base.selectedProgram.workingLists = programWorkingLists;
        });
    }

    var loadAttributesByProgram = function () {
        return AttributesFactory.getByProgram($scope.base.selectedProgram).then(function (atts) {
            $scope.programAttributes = $scope.base.programAttributes = atts;
            $scope.customWorkingListValues.attributes = AttributesFactory.generateAttributeFilters(angular.copy($scope.programAttributes));
        });
    }

    var loadCachedData = function () {
        var frontPageData = CurrentSelection.getFrontPageData();
        if (frontPageData && frontPageData.viewData && frontPageData.viewData.name.toLowerCase() === 'lists'
            && frontPageData.selectedProgram && frontPageData.selectedProgram.id
            && $scope.base.selectedProgram && $scope.base.selectedProgram.id
            && frontPageData.selectedProgram.id === $scope.base.selectedProgram.id) {
            var viewData = frontPageData.viewData;
            $scope.pager = viewData.pager;
            $scope.customWorkingListValues = viewData.customWorkingListValues;
            $scope.gridColumns = viewData.gridColumns;
            if (viewData.trackedEntityList.type == $scope.trackedEntityListTypes.CUSTOM) {
                $scope.setCustomWorkingList();
            } else {
                $scope.setWorkingList(viewData.trackedEntityList.config);
            }
        } else {
            CurrentSelection.setFrontPageData(null);
        }
    }

    var setDefault = function () {
        if (!$scope.currentTrackedEntityList && $scope.base.selectedProgram && $scope.base.selectedProgram.workingLists.length > 0) {
            $scope.setWorkingList($scope.base.selectedProgram.workingLists[0]);
        }
    }

    $scope.openTei = function (tei) {
        updateCurrentSelection();
        $location.path('/dashboard').search({
            tei: tei.id,
            program: $scope.base.selectedProgram ? $scope.base.selectedProgram.id : null,
            ou: $scope.selectedOrgUnit.id
        });
    }


    $scope.getWorkingListButtonClass = function (workingList) {
        if (workingList.name === "custom" && $scope.showCustomWorkingListInline) return "active";
        if ($scope.currentTrackedEntityList)
            if ($scope.currentTrackedEntityList.type === $scope.trackedEntityListTypes.WORKINGLIST) {
                var config = $scope.currentTrackedEntityList.config;
                if (config.name === workingList.name) {
                    return "active";
                }
            } else {
                if (workingList.name === "custom") {
                    return "active";
                }
            }
        return "";
    }

    $scope.setWorkingList = function (workingList) {
        setCurrentTrackedEntityList($scope.trackedEntityListTypes.WORKINGLIST, workingList, null);
        fetchWorkingList();
    }
    $scope.toggleShowCustomWorkingListInline = function () {
        $scope.showCustomWorkingListInline = !$scope.showCustomWorkingListInline;
    }

    var fetchWorkingList = function () {
        if ($scope.currentTrackedEntityList.type === $scope.trackedEntityListTypes.WORKINGLIST) {
            $scope.currentTrackedEntityList.loading = true;
            ProgramWorkingListService.getWorkingListData($scope.selectedOrgUnit, $scope.currentTrackedEntityList.config, $scope.pager, $scope.currentTrackedEntityList.sortColumn).then(setCurrentTrackedEntityListData);
        }
    }

    var setCurrentTrackedEntityList = function (type, config, data) {
        if ($scope.currentTrackedEntityList && $scope.currentTrackedEntityList.config) {
            $scope.currentTrackedEntityList.config.cachedOrgUnit = null;
            $scope.currentTrackedEntityList.config.cachedSorting = null;
        }
        $scope.showCustomWorkingListInline = false;
        $scope.currentTrackedEntityList = {type: type, config: config, data: data};
        if (!$scope.currentTrackedEntityList.sortColumn) {
            if ($scope.currentTrackedEntityList.config.program && $scope.currentTrackedEntityList.config.program.id == 'uYjxkTbwRNf') {
                //Indeks
                $scope.currentTrackedEntityList.sortColumn = {
                    id: 'X4VPaAa0RZ8',
                    direction: 'desc',
                }
            } else if ($scope.currentTrackedEntityList.config.program && $scope.currentTrackedEntityList.config.program.id == 'DM9n1bUw8W8') {
                //Nærkontakt
                $scope.currentTrackedEntityList.sortColumn = {
                    id: 'LSHcKMBLofN',
                    direction: 'desc',
                }
            } else {
                $scope.currentTrackedEntityList.sortColumn = {
                    id: 'created',
                    direction: 'desc',
                }
            }
        }
    }

    $scope.isAlleTildelteOppgaver = function () {
        return $scope.currentTrackedEntityList.config.id === INDEKS_ALLE_TILDELTE_OPPGAVER ||
            $scope.currentTrackedEntityList.config.id === NAERKONTAKT_ALLE_TILDELTE_OPPGAVER ||
            $scope.currentTrackedEntityList.config.id === INNREISE_ALLE_TILDELTE_OPPGAVER;
    };


    $scope.isIkkeTildelteOppgaver = function () {
        return $scope.currentTrackedEntityList.config.id === INDEKS_IKKE_TILDELTE_OPPGAVER ||
            $scope.currentTrackedEntityList.config.id === NAERKONTAKT_IKKE_TILDELTE_OPPGAVER ||
            $scope.currentTrackedEntityList.config.id === INNREISE_IKKE_TILDELTE_OPPGAVER;
    };

    $scope.addTildeltToTildeltListConditionally = function (serverResponse) {
        if ($scope.isAlleTildelteOppgaver() || $scope.isIkkeTildelteOppgaver()) {
            try {
                addTildeltToTildeltList($scope, serverResponse, TeiAccessApiService, MetaDataFactory, $q);
            } catch (err) {
                console.log(err);
                $scope.setServerResponse(serverResponse);
            }
        }
    };

    var setCurrentTrackedEntityListData = function (serverResponse) {
        $scope.numberOfSelectedRows = 0;
        if (serverResponse.rows && serverResponse.rows.length > 0
            && ($scope.base.selectedProgram.id == 'uYjxkTbwRNf'
                || $scope.base.selectedProgram.id == 'DM9n1bUw8W8')) {
            var allTeis = [];
            serverResponse.rows.forEach(function (row) {
                allTeis.push(row[0]);
            });

            var dataElement = 'BoUcoEx9sVl';
            var programStage = 'LpWNjNGvCO5';
            var transferStage = 'zAstsy3slf9';

            if ($scope.base.selectedProgram.id == 'DM9n1bUw8W8') {
                dataElement = 'JNF44zBaNqn';
                programStage = 'sAV9jAajr8x';
                transferStage = 'xK50EzZwHkn';
            }
            TEIService.getListWithProgramData(allTeis, $scope.base.selectedProgram.id, dataElement, programStage, $scope.selectedOrgUnit.id, transferStage).then(function (dateDictionary) {
                serverResponse.rows.forEach(async function (row) {
                    if (dateDictionary[row[0]] && dateDictionary[row[0]].transferStatus) {
                        row[4] = "Overført";
                        row.push(dateDictionary[row[0]].transferStatus);
                    } else {
                        row.push('');
                    }
                });

                serverResponse.headers.push({
                    column: "TransferStatus",
                    hidden: false,
                    meta: false,
                    name: "Overføringsstatus",
                    type: "java.lang.String"
                });

                $scope.addTildeltToTildeltListConditionally(serverResponse);
                $scope.setServerResponse(serverResponse);
            }, function (error) {
                $scope.setServerResponse(serverResponse);
            });
        } else if (serverResponse.rows && serverResponse.rows.length > 0
            && ($scope.base.selectedProgram.id == INNREISE_PROGRAM_ID || $scope.base.selectedProgram.id == DUPLIKAT_PROGRAM_ID)) {
            try {
                $scope.addTildeltToTildeltListConditionally(serverResponse);
                addEventDataToInnreiseList($scope, serverResponse, TeiAccessApiService, MetaDataFactory);
            } catch (err) {
                console.log(err);
                $scope.setServerResponse(serverResponse);
            }
        } else {
            $scope.addTildeltToTildeltListConditionally(serverResponse);
            $scope.setServerResponse(serverResponse);
        }
    };

    $scope.setServerResponse = function (serverResponse) {
        $scope.currentTrackedEntityList.data = TEIGridService.format($scope.selectedOrgUnit.id, serverResponse, false, $scope.base.optionSets, null);
        $scope.currentTrackedEntityList.loading = false;
        $scope.pager = $scope.currentTrackedEntityList.data.pager
    };

    $scope.fetchTeis = function (pager, sortColumn) {
        var s = 1;
        if ($scope.currentTrackedEntityList) {
            if ($scope.currentTrackedEntityList.type === $scope.trackedEntityListTypes.CUSTOM) {
                $scope.fetchCustomWorkingList();
            } else {
                fetchWorkingList();
            }
        }
    }

    $scope.setCustomWorkingList = function () {
        var customConfig = {
            queryUrl: "",
            programUrl: "",
            attributeUrl: {url: null, hasValue: false},
            ouMode: $scope.customWorkingListValues.ouMode,
            orgUnit: $scope.selectedOrgUnit,
        };

        if ($scope.base.selectedProgram) {
            customConfig.programUrl = 'program=' + $scope.base.selectedProgram.id;
            if ($scope.customWorkingListValues.programStatus) {
                customConfig.programUrl += "&programStatus=" + $scope.customWorkingListValues.programStatus;
            }
        }


        customConfig.assignUrl = "";
        if ($scope.customWorkingListValues.assignedUserMode) {
            customConfig.assignUrl += "&assignedUserMode=" + $scope.customWorkingListValues.assignedUserMode;
        }
        if (!$scope.customWorkingListValues.assignedUserMode || $scope.customWorkingListValues.assignedUserMode == "PROVIDED"
            && $scope.customWorkingListValues.assignedUsers) {
            if (customConfig.assignUrl) customConfig.assignUrl += "&";
            customConfig.assignUrl += "assignedUser=" + $scope.customWorkingListValues.assignedUsers;
        }

        customConfig.attributeUrl = EntityQueryFactory.getAttributesQuery($scope.customWorkingListValues.attributes, $scope.customWorkingListValues.enrollment);

        setCurrentTrackedEntityList($scope.trackedEntityListTypes.CUSTOM, customConfig, null);
        $scope.fetchCustomWorkingList(customConfig);
    }

    var getOrderUrl = function (urlToExtend) {
        if ($scope.currentTrackedEntityList.sortColumn) {
            var sortColumn = $scope.currentTrackedEntityList.sortColumn;
            if (urlToExtend) {
                return urlToExtend += "&order=" + sortColumn.id + ':' + sortColumn.direction;
            }
            return "order=" + sortColumn.id + ":" + sortColumn.direction;
        }

    }


    $scope.fetchCustomWorkingList = function () {
        if (!$scope.currentTrackedEntityList.type == $scope.trackedEntityListTypes.CUSTOM) return;
        var customConfig = $scope.currentTrackedEntityList.config;
        var sortColumn = $scope.currentTrackedEntityList.sortColumn;
        $scope.currentTrackedEntityList.loading = true;
        customConfig.queryAndSortUrl = customConfig.queryUrl;
        if (sortColumn) {
            var order = '&order=' + sortColumn.id + ':' + sortColumn.direction;
            customConfig.queryAndSortUrl = customConfig.queryAndSortUrl.concat(order);
        }
        if (customConfig.assignUrl) {
            customConfig.queryAndSortUrl = customConfig.queryAndSortUrl.concat(customConfig.assignUrl);
        }

        TEIService.search(customConfig.orgUnit.id, customConfig.ouMode.name, customConfig.queryAndSortUrl, customConfig.programUrl, customConfig.attributeUrl.url, $scope.pager, true)
            .then(setCurrentTrackedEntityListData);
    }

    $scope.expandCollapseOrgUnitTree = function (orgUnit) {
        if (orgUnit.hasChildren) {
            //Get children for the selected orgUnit
            OrgUnitFactory.getChildren(orgUnit.id).then(function (ou) {
                orgUnit.show = !orgUnit.show;
                orgUnit.hasChildren = false;
                orgUnit.children = ou.children;
                angular.forEach(orgUnit.children, function (ou) {
                    ou.hasChildren = ou.children && ou.children.length > 0 ? true : false;
                });
            });
        } else {
            orgUnit.show = !orgUnit.show;
        }
    };

    /**
     * TeiList
     * Sort by grid column
     * @param {*} gridHeader
     */
    $scope.sortGrid = function (gridHeader) {
        var sortColumn = $scope.currentTrackedEntityList.sortColumn;
        if (sortColumn && sortColumn.id === gridHeader.id) {
            sortColumn.direction = sortColumn.direction === 'asc' ? 'desc' : 'asc';
        } else {
            $scope.currentTrackedEntityList.sortColumn = {id: gridHeader.id, direction: 'asc'};
        }
        fetchTeis();
    };

    $scope.showHideListColumns = function () {
        return $modal.open({
            templateUrl: 'components/home/lists/grid-columns-modal.html',
            resolve: {
                gridColumns: function () {
                    return angular.copy($scope.gridColumns);
                }
            },
            controller: function ($scope, gridColumns, $modalInstance) {
                $scope.gridColumns = gridColumns;
                $scope.showCount = 0;
                angular.forEach(gridColumns, function (column) {
                    if (column.show) $scope.showCount++;
                });
                $scope.valueChanged = function (column) {
                    if (column.show) $scope.showCount++;
                    else $scope.showCount--;
                }
                $scope.save = function () {
                    $modalInstance.close($scope.gridColumns);
                }
            }
        }).result.then(function (gridColumns) {
            $scope.gridColumns = gridColumns;
            var userGridColumns = {};
            angular.forEach(gridColumns, function (gc) {
                userGridColumns[gc.id] = gc;
            });
            return UserDataStoreService.set(userGridColumns, gridColumnsContainer, $scope.base.selectedProgram.id);
        }, function () {
        });
    }

    $scope.isInnreiseProgram = function (program) {
        return program && program.id == INNREISE_PROGRAM_ID;
    }

    $scope.isIndeksProgram = function (program) {
        return program && program.id == INDEKSERING_PROGRAM_ID;
    }

    $scope.isStatusArbeidsliste = function () {
        return $scope.currentTrackedEntityList.config.id === INDEKS_STATUS_ARBEIDSLISTE;
    }

    $scope.proveSvarSyncIsLoading = false;
    $scope.syncLabTests = function () {
        if ($scope.isInnreiseProgram($scope.selectedProgram)) {
            $scope.provesvarStartFailed = false;
            var userId;
            try {
                userId = JSON.parse(sessionStorage.USER_PROFILE).id
            } finally {
            }
            $scope.proveSvarSyncIsLoading = true;
            FNrLookupService.startLabTestSync($scope.selectedOrgUnit.code, userId).then(function (svar) {
                $scope.proveSvarSyncIsLoading = false;
                if (svar) {
                    $scope.mapInnreiseStatusToScope(svar);
                    fetchWorkingList();

                } else {
                    $scope.provesvarStartFailed = true;
                    $scope.kanStarteNyProvesvarSynk = false;
                }
            });
        }
    }

    $scope.provesvarStatusLastet = false;
    $scope.provesvarStartFailed = false;
    $scope.provesvarAktivert = false;
    $scope.harTilgangTilProvesvar = false;
    $scope.innreiseSistOppdatert = false;
    $scope.innreiseProvesvarSistOppdatert = false;
    $scope.kanStarteNyProvesvarSynk = null;
    $scope.provesvarStatus = null;
    $scope.innreiseStatus = null;

    $scope.mapInnreiseStatusToScope = function (svar) {
        $scope.provesvarStatusLastet = true;
        $scope.provesvarAktivert = svar.provesvarAktivert;
        $scope.innreiseProvesvarSistOppdatert = svar.innreiseProvesvarSistOppdatert ? convertDatestringToFullTime(svar.innreiseProvesvarSistOppdatert) : undefined;
        $scope.innreiseSistOppdatert = svar.innreiseSistOppdatert ? convertDatestringToFullTime(svar.innreiseSistOppdatert) : undefined;
        $scope.kanStarteNyProvesvarSynk = svar.kanStarteNyProvesvarSynk;
        $scope.harTilgangTilProvesvar = svar.harTilgangTilProvesvar;
        $scope.provesvarStatus = svar.provesvarStatus;
        $scope.innreiseStatus = svar.innreiseStatus;
    }

    $scope.checkLabTestStatus = function () {
        if ($scope.isInnreiseProgram($scope.selectedProgram)) {
            var userId;
            try {
                userId = JSON.parse(sessionStorage.USER_PROFILE).id
            } finally {
            }
            FNrLookupService.getLabTestStatus($scope.selectedOrgUnit.code, userId).then(function (svar) {
                if (svar) {
                    $scope.mapInnreiseStatusToScope(svar);
                } else {
                    $scope.innreiseStatusQueryFailed = true;
                }
            });
        }
    };

    $scope.importLabTests = function () {
        if ($scope.isStatusArbeidsliste()) {
            $scope.msisStartFailed = false;
            var userId;
            try {
                userId = JSON.parse(sessionStorage.USER_PROFILE).id
            } finally {
            }
            $scope.msisImportIsLoading = true;
            FNrLookupService.startMsisSync($scope.selectedOrgUnit.code, userId).then(function (svar) {
                $scope.msisImportIsLoading = false;
                if (svar) {
                    $scope.mapMsisStatusToScope(svar);
                    fetchWorkingList();
                } else {
                    $scope.msisStartFailed = true;
                    $scope.kanStarteNyMsisSynk = false;
                }
            });
        }
    }

    $scope.msisStatusLastet = false;
    $scope.msisStartFailed = false;
    $scope.msisAktivert = false;
    $scope.harTilgangTilMsis = false;
    $scope.msisSistOppdatert = false;
    $scope.kanStarteNyMsisSynk = null;
    $scope.msisStatus = null;
    $scope.msisStatusQueryFailed = false;

    $scope.mapMsisStatusToScope = function (svar) {
        $scope.msisStatusLastet = true;
        $scope.msisAktivert = svar.importAktivert;
        $scope.msisSistOppdatert = svar.sistOppdatert ? convertDatestringToFullTime(svar.sistOppdatert) : undefined;
        $scope.kanStarteNyMsisSynk = svar.kanStarteNySynk;
        $scope.harTilgangTilProvesvar = svar.harTilgangTilProvesvar;
        $scope.msisStatus = svar.status;
    }

    $scope.getMsisStatus = function () {
        if ($scope.isIndeksProgram($scope.selectedProgram)) {
            var userId;
            try {
                userId = JSON.parse(sessionStorage.USER_PROFILE).id
            } finally {
            }
            FNrLookupService.getMsisStatus($scope.selectedOrgUnit.code, userId).then(function (svar) {
                if (svar) {
                    $scope.mapMsisStatusToScope(svar);
                } else {
                    $scope.msisStatusQueryFailed = true;
                }
            });
        }
    }


    $scope.showNoProvesvardataHentet = function () {
        return !$scope.innreiseProvesvarSistOppdatert && !$scope.hasStartedSync;
    };

    $scope.checkLabTestStatus();
    $scope.getMsisStatus();


    $scope.getExportList = function (format) {
        var deferred = $q.defer();
        if ($scope.currentTrackedEntityList) {
            var attrIdList = null;
            var attrNamesList = [];
            var attrNamesIdMap = {};
            if (!format || ($scope.listExportFormats.indexOf(format) === -1)) {
                return;
            }
            format = format.toLowerCase();

            angular.forEach($scope.gridColumns, function (item) {
                if (item.show && item.attribute) {
                    if (!attrIdList) {
                        attrIdList = "attribute=" + item.id;
                    } else {
                        attrIdList += "&attribute=" + item.id;
                    }
                    attrNamesList.push(item.id);
                    attrNamesIdMap[item.displayName] = item.id;
                }
            });

            var config = $scope.currentTrackedEntityList.config;
            var promise;
            var program = "program=" + $scope.currentTrackedEntityList.config.program.id;
            if ($scope.currentTrackedEntityList.type === $scope.trackedEntityListTypes.CUSTOM) {
                promise = TEIService.search($scope.selectedOrgUnit.id, config.ouMode.name, config.queryAndSortUrl, config.programUrl, attrIdList, false, false, format, attrNamesList, attrNamesIdMap, $scope.base.optionSets);
            } else {
                promise = TEIService.search($scope.selectedOrgUnit.id, ouModes[0].name, config.url, program, attrIdList, false, false, format, attrNamesList, attrNamesIdMap, $scope.base.optionSets);
            }
            promise.then(function (data) {
                var fileName = "trackedEntityList." + format;// any file name with any extension
                var a = document.createElement('a');
                var blob, url;
                a.style = "display: none";
                blob = new Blob(['' + data], {type: "octet/stream", endings: 'native'});
                url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(function () {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 300);
                deferred.resolve(data);
            });
            return deferred.promise;

        }

    };

    var updateCurrentSelection = function () {
        if ($scope.currentTrackedEntityList && $scope.currentTrackedEntityList.data) {
            var data = $scope.currentTrackedEntityList.data;
            var sortedTei = [];
            var sortedTeiIds = [];
            if (data.rows && data.rows.own) {
                sortedTei = sortedTei.concat(data.rows.own);
            }
            if (data.rows && data.rows.other) {
                sortedTei = sortedTei.concat(data.rows.other);
            }
            sortedTei = $filter('orderBy')(sortedTei, function (tei) {
                if ($scope.currentTrackedEntityList.sortColumn && $scope.currentTrackedEntityList.sortColumn.valueType === 'date') {
                    var d = tei[$scope.currentTrackedEntityList.sortColumn.id];
                    return DateUtils.getDate(d);
                }
                return tei[$scope.currentTrackedEntityList.sortColumn.id];
            }, $scope.currentTrackedEntityList.direction == 'desc');

            angular.forEach(sortedTei, function (tei) {
                sortedTeiIds.push(tei.id);
            });
            CurrentSelection.setSortedTeiIds(sortedTeiIds);
        }
        if (typeof $scope.base.setFrontPageData === "function") {
            var viewData = {
                name: "lists",
                trackedEntityList: $scope.currentTrackedEntityList,
                customWorkingListValues: $scope.customWorkingListValues,
                gridColumns: $scope.gridColumns,
                selectedOrgUnit: $scope.selectedOrgUnit,
                pager: $scope.pager
            }
            $scope.base.setFrontPageData(viewData);
        }
    }

    $scope.completeSelectedEnrollments = function () {
        var modalOptions = {
            closeButtonText: 'no',
            actionButtonText: 'yes',
            headerText: 'complete_selected_enrollments',
            bodyText: 'are_you_sure_to_complete_selected_enrollments'
        };


        ModalService.showModal({}, modalOptions).then(function (result) {

            var selectedTeis = [];
            $scope.currentTrackedEntityList.data.rows.own.forEach(function (row) {
                if (row.checkBoxTicked) {
                    selectedTeis.push(row.id);
                }
            });
            const programId = $scope.base.selectedProgram.id;
            TEIService.getActiveEnrollments(selectedTeis, programId, $scope.selectedOrgUnit.id).then(function (enrollments) {
                enrollments.enrollments.forEach((enrollment) => enrollment.status = 'COMPLETED');
                $http({
                    method: 'POST',
                    url: DHIS2URL + '/enrollments',
                    data: enrollments,
                    headers: {'ingress-csrf': $cookies['ingress-csrf']}
                }).then(function () {
                    $scope.setWorkingList($scope.currentTrackedEntityList.config);
                });
            })
        });
    }
});
