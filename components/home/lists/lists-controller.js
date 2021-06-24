import {
    COUNTRY_LOOKUP_ID,
    INNREISE_AVREISELAND_DATA_ELEMENT_ID, INNREISE_OPPFOLGINGSTATUS_ID,
    INNREISE_PROGRAM_ID,
    INNREISEINFORMASJON_PROGRAM_STAGE_ID, STATUS_OPPFOLGNING_LOOKUP_ID
} from "../../../utils/constants";
import {convertDatestringToDDMMYYYY, convertDatestringToFullTime} from "../../../utils/converters";
import {importEventToListAsync} from "../../../ks_patches/import_event_to_list";
import {addEventDataToInnreiseList} from "../../../ks_patches/add_event_data_to_innreise_list";

var trackerCapture = angular.module('trackerCapture');

trackerCapture.controller('ListsController',function(
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
    $http) {
        var ouModes = [{name: 'SELECTED'}, {name: 'CHILDREN'}, {name: 'DESCENDANTS'}, {name: 'ACCESSIBLE'}];
        var userGridColumns = null;
        var defaultCustomWorkingListValues = { ouMode: ouModes[0], programStatus: ""};
        var gridColumnsContainer = "trackerCaptureGridColumns";

        $scope.workingListTypes = { NORMAL: "NORMAL", CUSTOM: "CUSTOM"};
        $scope.trackedEntityListTypes = { WORKINGLIST: "WORKINGLIST", CUSTOM: "CUSTOM"};
        $scope.listExportFormats = ["XML","JSON","CSV"];
        $scope.customWorkingListValues = defaultCustomWorkingListValues;
        $scope.defaultOperators = OperatorFactory.defaultOperators;
        $scope.boolOperators = OperatorFactory.boolOperators;

        var initPager = function(){
            $scope.defaultRequestProps = {
                skipTotalPages: true
            };

            $scope.pager = {
                ...$scope.defaultRequestProps,
                pageSize: 50,
                page: 1
            };
        }
        initPager();

        $scope.$watch('base.selectedProgram', function() {
            init();
        });

        var init = function(){
            if( angular.isObject($scope.base.selectedProgram)){
                initPager();
                reset();
                loadAttributesByProgram()
                .then(loadGridColumns)
                .then(loadWorkingLists)
                .then(loadCachedData)
                .then(setDefault);
            }
        }

        var reset = function(){
            $scope.customWorkingListValues = defaultCustomWorkingListValues;
            $scope.currentTrackedEntityList = null;
            $scope.gridColumns = null;
        }
        var resolvedEmptyPromise = function(){
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
        }

        var loadGridColumns = function(){
            if($scope.base.selectedProgram){
                return UserDataStoreService.get(gridColumnsContainer, $scope.base.selectedProgram.id).then(function(savedGridColumns){
                    var gridColumnConfig = { defaultRange: {start: 3, end: 7}};
                    var lastDateName = $scope.base.selectedProgram.id == 'uYjxkTbwRNf' ? 'last_date_in_isolation' : $scope.base.selectedProgram.id == 'DM9n1bUw8W8' ? 'last_date_in_quarantine' : '';

                    $scope.gridColumns = TEIGridService.makeGridColumns($scope.programAttributes,gridColumnConfig, savedGridColumns, lastDateName);
                    /*
                    $scope.gridColumns = [];
                    angular.forEach($scope.programAttributes, function(attr){
                        if(attr.displayInListNoProgram){
                            var gridColumn = {id: attr.id, displayName: attr.displayName, show: false, valueType: attr.valueType};
                            if(savedGridColumns[attr.id]){
                                gridColumn.show = savedGridColumns[attr.id].show;
                            }else if(attr.programTrackedEntityAttribute.displayInList){
                                gridColumn.show = true;
                            }
                            $scope.gridColumns.push(gridColumn);
                        }

                    });*/
                });
            }
            return resolvedEmptyPromise();

        }

        
        var loadWorkingLists = function(){
            return ProgramWorkingListService.getWorkingListsForProgram($scope.base.selectedProgram).then(function(programWorkingLists){
                $scope.base.selectedProgram.workingLists = programWorkingLists;
            });
        }

        var loadAttributesByProgram = function(){
            return AttributesFactory.getByProgram($scope.base.selectedProgram).then(function(atts){
                $scope.programAttributes = $scope.base.programAttributes = atts;
                $scope.customWorkingListValues.attributes = AttributesFactory.generateAttributeFilters(angular.copy($scope.programAttributes));
            });
        }

        var loadCachedData = function(){
            var frontPageData = CurrentSelection.getFrontPageData();
            if(frontPageData && frontPageData.viewData && frontPageData.viewData.name.toLowerCase() === 'lists'
            && frontPageData.selectedProgram && frontPageData.selectedProgram.id 
            && $scope.base.selectedProgram && $scope.base.selectedProgram.id 
            && frontPageData.selectedProgram.id === $scope.base.selectedProgram.id ){
                var viewData = frontPageData.viewData;
                $scope.pager = viewData.pager;
                $scope.customWorkingListValues = viewData.customWorkingListValues;
                $scope.gridColumns = viewData.gridColumns;
                if(viewData.trackedEntityList.type == $scope.trackedEntityListTypes.CUSTOM){
                    $scope.setCustomWorkingList();
                }else{
                    $scope.setWorkingList(viewData.trackedEntityList.config);
                }
            }else{
                CurrentSelection.setFrontPageData(null);
            }
        }

        var setDefault = function(){
            if(!$scope.currentTrackedEntityList && $scope.base.selectedProgram && $scope.base.selectedProgram.workingLists.length > 0){
                $scope.setWorkingList($scope.base.selectedProgram.workingLists[0]);
            }
        }

        $scope.openTei = function(tei){
            updateCurrentSelection();
            $location.path('/dashboard').search({tei: tei.id,
                program: $scope.base.selectedProgram ? $scope.base.selectedProgram.id: null,
                ou: $scope.selectedOrgUnit.id});
        }
    

        $scope.getWorkingListButtonClass = function(workingList){
            if(workingList.name ==="custom" && $scope.showCustomWorkingListInline) return "active";
            if($scope.currentTrackedEntityList)
                if($scope.currentTrackedEntityList.type === $scope.trackedEntityListTypes.WORKINGLIST){
                    var config = $scope.currentTrackedEntityList.config;
                    if(config.name === workingList.name){
                        return "active";
                    }
                }else{
                    if(workingList.name === "custom"){
                        return "active";
                    }
                }
            return "";
        }

        $scope.setWorkingList = function(workingList){
            setCurrentTrackedEntityList($scope.trackedEntityListTypes.WORKINGLIST, workingList, null);
            fetchWorkingList();
        }
        $scope.toggleShowCustomWorkingListInline = function(){
            $scope.showCustomWorkingListInline = !$scope.showCustomWorkingListInline;
        }

        var fetchWorkingList = function(){
            if($scope.currentTrackedEntityList.type === $scope.trackedEntityListTypes.WORKINGLIST){
                $scope.currentTrackedEntityList.loading = true;
                ProgramWorkingListService.getWorkingListData($scope.selectedOrgUnit, $scope.currentTrackedEntityList.config, $scope.pager, $scope.currentTrackedEntityList.sortColumn).then(setCurrentTrackedEntityListData);
            }
        }

        var setCurrentTrackedEntityList = function(type, config, data){
            if($scope.currentTrackedEntityList && $scope.currentTrackedEntityList.config){
                $scope.currentTrackedEntityList.config.cachedOrgUnit = null;
                $scope.currentTrackedEntityList.config.cachedSorting = null;
            }
            $scope.showCustomWorkingListInline = false;
            $scope.currentTrackedEntityList = { type: type, config: config, data: data };
            if(!$scope.currentTrackedEntityList.sortColumn){
                $scope.currentTrackedEntityList.sortColumn = {
                    id: 'created',
                    direction: 'asc',
                }
            }
        }

        var setCurrentTrackedEntityListData = function(serverResponse){
            $scope.numberOfSelectedRows = 0;
            if(serverResponse.rows && serverResponse.rows.length > 0
                && ($scope.base.selectedProgram.id == 'uYjxkTbwRNf'
                || $scope.base.selectedProgram.id == 'DM9n1bUw8W8')) {
                var allTeis = [];
                serverResponse.rows.forEach(function(row){
                    allTeis.push(row[0]);
                });

                var dataElement = 'BoUcoEx9sVl';
                var programStage = 'LpWNjNGvCO5';
                var transferStage = 'zAstsy3slf9';
                
                if($scope.base.selectedProgram.id == 'DM9n1bUw8W8') {
                    dataElement = 'JNF44zBaNqn';
                    programStage = 'sAV9jAajr8x';
                    transferStage = 'xK50EzZwHkn';
                }
                TEIService.getListWithProgramData(allTeis,$scope.base.selectedProgram.id,dataElement,programStage,$scope.selectedOrgUnit.id,transferStage).then(function(dateDictionary){
                    serverResponse.rows.forEach(async function(row){
                        if(dateDictionary[row[0]] && dateDictionary[row[0]].enrollmentDate){
                            //Set enrollment date instead of created date:
                            row[1] = (dateDictionary[row[0]].enrollmentDate);
                        }

                        if(dateDictionary[row[0]] && dateDictionary[row[0]].dataValue){
                            row.push(dateDictionary[row[0]].dataValue);
                        }
                        else {
                            row.push('');
                        }

                        if(dateDictionary[row[0]] && dateDictionary[row[0]].transferStatus){
                            row[4] = "Overført";
                            row.push(dateDictionary[row[0]].transferStatus);
                        }
                        else {
                            row.push('');
                        }
                    });

                    serverResponse.headers.push( {column: "LastDate", hidden: false, meta: false, name: "last_date", type:"java.lang.String" });
                    serverResponse.headers.push( {column: "TransferStatus", hidden: false, meta: false, name: "Overføringsstatus", type:"java.lang.String" });

                    if( $scope.currentTrackedEntityList.sortColumn.id == 'created' ) {
                        serverResponse.rows = $filter('orderBy')(serverResponse.rows, function(tei) {
                            return tei[1];
                        }, $scope.currentTrackedEntityList.sortColumn.direction != 'desc');
                    }
                    if( $scope.currentTrackedEntityList.sortColumn.id == 'last_date' ) {
                        serverResponse.rows = $filter('orderBy')(serverResponse.rows, function(tei) {
                            return tei[tei.length - 2];
                        }, $scope.currentTrackedEntityList.sortColumn.direction != 'desc');
                    }
                    
                    
                    $scope.setServerResponse(serverResponse);
                },function(error){
                    $scope.setServerResponse(serverResponse);
                });
            }
            else if(serverResponse.rows && serverResponse.rows.length > 0
                && ($scope.base.selectedProgram.id == INNREISE_PROGRAM_ID)) {
                try {
                    addEventDataToInnreiseList($scope, serverResponse, TeiAccessApiService, MetaDataFactory);
                } catch (err) {
                    console.log(err);
                    $scope.setServerResponse(serverResponse);
                }
            }
            else {
                $scope.setServerResponse(serverResponse);
            }
        }

        $scope.setServerResponse = function(serverResponse) {
            $scope.currentTrackedEntityList.data = TEIGridService.format($scope.selectedOrgUnit.id, serverResponse, false, $scope.base.optionSets, null);
            $scope.currentTrackedEntityList.loading = false;
            $scope.pager = $scope.currentTrackedEntityList.data.pager
        };

        $scope.fetchTeis = function(pager, sortColumn){
            var s = 1;
            if($scope.currentTrackedEntityList){
                if($scope.currentTrackedEntityList.type === $scope.trackedEntityListTypes.CUSTOM){
                    $scope.fetchCustomWorkingList();
                }else{
                    fetchWorkingList();
                }
            }
        }

        $scope.setCustomWorkingList = function(){
            var customConfig = {
                queryUrl: "",
                programUrl: "", 
                attributeUrl: { url: null, hasValue: false }, 
                ouMode: $scope.customWorkingListValues.ouMode,
                orgUnit: $scope.selectedOrgUnit,
            };

            if($scope.base.selectedProgram){
                customConfig.programUrl = 'program=' + $scope.base.selectedProgram.id;
                if($scope.customWorkingListValues.programStatus){
                    customConfig.programUrl += "&programStatus="+$scope.customWorkingListValues.programStatus;
                }
            }


            customConfig.assignUrl = "";
            if($scope.customWorkingListValues.assignedUserMode){
                customConfig.assignUrl += "&assignedUserMode="+$scope.customWorkingListValues.assignedUserMode;
            }
            if(!$scope.customWorkingListValues.assignedUserMode ||$scope.customWorkingListValues.assignedUserMode == "PROVIDED" 
            && $scope.customWorkingListValues.assignedUsers){
                if(customConfig.assignUrl) customConfig.assignUrl+="&";
                customConfig.assignUrl += "assignedUser="+$scope.customWorkingListValues.assignedUsers;
            }
            
            customConfig.attributeUrl = EntityQueryFactory.getAttributesQuery($scope.customWorkingListValues.attributes, $scope.customWorkingListValues.enrollment);

            setCurrentTrackedEntityList($scope.trackedEntityListTypes.CUSTOM, customConfig, null);
            $scope.fetchCustomWorkingList(customConfig);
        }

        var getOrderUrl = function(urlToExtend){
            if($scope.currentTrackedEntityList.sortColumn){
                var sortColumn = $scope.currentTrackedEntityList.sortColumn;
                if(urlToExtend){
                    return urlToExtend += "&order="+sortColumn.id+':'+sortColumn.direction;
                }
                return "order="+sortColumn.id+":"+sortColumn.direction;
            }

        }


        $scope.fetchCustomWorkingList= function(){
            if(!$scope.currentTrackedEntityList.type == $scope.trackedEntityListTypes.CUSTOM) return;
            var customConfig = $scope.currentTrackedEntityList.config;
            var sortColumn = $scope.currentTrackedEntityList.sortColumn;
            $scope.currentTrackedEntityList.loading = true;
            customConfig.queryAndSortUrl = customConfig.queryUrl;
            if(sortColumn){
                var order = '&order=' + sortColumn.id + ':' +sortColumn.direction;
                customConfig.queryAndSortUrl = customConfig.queryAndSortUrl.concat(order);
            }
            if(customConfig.assignUrl){
                customConfig.queryAndSortUrl = customConfig.queryAndSortUrl.concat(customConfig.assignUrl);
            }
            
            TEIService.search(customConfig.orgUnit.id,customConfig.ouMode.name, customConfig.queryAndSortUrl, customConfig.programUrl, customConfig.attributeUrl.url, $scope.pager, true)
            .then(setCurrentTrackedEntityListData);
        }

        $scope.expandCollapseOrgUnitTree = function(orgUnit) {
            if( orgUnit.hasChildren ){
                //Get children for the selected orgUnit
                OrgUnitFactory.getChildren(orgUnit.id).then(function(ou) {
                    orgUnit.show = !orgUnit.show;
                    orgUnit.hasChildren = false;
                    orgUnit.children = ou.children;
                    angular.forEach(orgUnit.children, function(ou){
                        ou.hasChildren = ou.children && ou.children.length > 0 ? true : false;
                    });
                });
            }
            else{
                orgUnit.show = !orgUnit.show;
            }
        };

        /**
         * TeiList
         * Sort by grid column
         * @param {*} gridHeader 
         */
        $scope.sortGrid = function(gridHeader){
            var sortColumn = $scope.currentTrackedEntityList.sortColumn;
            if (sortColumn && sortColumn.id === gridHeader.id){
                sortColumn.direction = sortColumn.direction === 'asc' ? 'desc' : 'asc';
            }else{
                $scope.currentTrackedEntityList.sortColumn = {id: gridHeader.id, direction: 'asc'};
            }
            fetchTeis();
        };

        $scope.showHideListColumns = function(){    
            return $modal.open({
                templateUrl: 'components/home/lists/grid-columns-modal.html',
                resolve: {
                    gridColumns: function () {
                        return angular.copy($scope.gridColumns);
                    }
                },
                controller: function($scope, gridColumns, $modalInstance){
                    $scope.gridColumns = gridColumns;
                    $scope.showCount = 0;
                    angular.forEach(gridColumns, function(column){
                        if(column.show) $scope.showCount++;
                    });
                    $scope.valueChanged = function(column){
                        if(column.show) $scope.showCount++;
                        else $scope.showCount--;
                    }
                    $scope.save = function(){
                        $modalInstance.close($scope.gridColumns);
                    }
                }
            }).result.then(function(gridColumns)
            {
                $scope.gridColumns = gridColumns;
                var userGridColumns = {};
                angular.forEach(gridColumns, function(gc){
                    userGridColumns[gc.id] = gc;
                });
                return UserDataStoreService.set(userGridColumns, gridColumnsContainer, $scope.base.selectedProgram.id);
            }, function(){});
        }

        $scope.useLabTestForProgram = function(program) {
            return program && program.id == 'B7gOGodZkcs';
        }

        $scope.hasStartedSync = false;
        $scope.syncLabTests = function () {
            if($scope.useLabTestForProgram($scope.selectedProgram)) {
                var userId;
                try{
                    userId = JSON.parse(sessionStorage.USER_PROFILE).id
                }
                finally {}
                $scope.hasStartedSync = true;
                FNrLookupService.startLabTestSync($scope.selectedOrgUnit.code, userId).then(function(svar){
                    if(!svar) {
                        $scope.hasStartedSync = false;
                    }
                });
            }
        }


        $scope.provesvarAktivert = false;
        $scope.harTilgangTilProvesvar = false;
        $scope.innreiseSistOppdatert = false;
        $scope.innreiseProvesvarSistOppdatert = false;
        $scope.kanStarteNyProvesvarSynk = null;

        $scope.checkLabTestStatus = function() {
            if($scope.useLabTestForProgram($scope.selectedProgram)) {
                var userId;
                try{
                    userId = JSON.parse(sessionStorage.USER_PROFILE).id
                }
                finally {}
                FNrLookupService.getLabTestStatus($scope.selectedOrgUnit.code, userId).then(function(svar){
                    if(svar) {
                        $scope.provesvarAktivert = svar.provesvarAktivert;
                        $scope.innreiseProvesvarSistOppdatert = svar.innreiseProvesvarSistOppdatert ? convertDatestringToFullTime(svar.innreiseProvesvarSistOppdatert) : undefined;
                        $scope.innreiseSistOppdatert = svar.innreiseSistOppdatert ? convertDatestringToFullTime(svar.innreiseSistOppdatert) : undefined;
                        $scope.kanStarteNyProvesvarSynk = svar.kanStarteNyProvesvarSynk;
                        $scope.harTilgangTilProvesvar = svar.harTilgangTilProvesvar;
                    }
                    else {
                        $scope.labTestQueryFailed =  true;
                    }
                });
            }
        };

        $scope.showNoProvesvardataHentet = function() {
            return !$scope.innreiseProvesvarSistOppdatert && !$scope.hasStartedSync;
        };

        $scope.showProvesvarSyncButton = function() {
            return $scope.harTilgangTilProvesvar && $scope.provesvarAktivert && $scope.kanStarteNyProvesvarSynk && !$scope.hasStartedSync;
        };


        $scope.checkLabTestStatus();

        
        $scope.getExportList = function (format) {
            var deferred = $q.defer();
            if($scope.currentTrackedEntityList){
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
                if($scope.currentTrackedEntityList.type === $scope.trackedEntityListTypes.CUSTOM){
                    promise = TEIService.search($scope.selectedOrgUnit.id, config.ouMode.name, config.queryAndSortUrl, config.programUrl, attrIdList, false, false, format, attrNamesList, attrNamesIdMap, $scope.base.optionSets);
                }else{
                    promise = TEIService.search($scope.selectedOrgUnit.id, ouModes[0].name, config.url,program, attrIdList, false, false,format, attrNamesList, attrNamesIdMap,$scope.base.optionSets);
                }
                promise.then(function(data){    
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

        var updateCurrentSelection = function(){
            if($scope.currentTrackedEntityList && $scope.currentTrackedEntityList.data){
                var data = $scope.currentTrackedEntityList.data;
                var sortedTei = [];
                var sortedTeiIds = [];
                if(data.rows && data.rows.own) {
                    sortedTei = sortedTei.concat(data.rows.own);
                }
                if(data.rows && data.rows.other) {
                    sortedTei = sortedTei.concat(data.rows.other);
                }
                sortedTei = $filter('orderBy')(sortedTei, function(tei) {
                    if($scope.currentTrackedEntityList.sortColumn && $scope.currentTrackedEntityList.sortColumn.valueType === 'date'){
                        var d = tei[$scope.currentTrackedEntityList.sortColumn.id];
                        return DateUtils.getDate(d);
                    }
                    return tei[$scope.currentTrackedEntityList.sortColumn.id];
                }, $scope.currentTrackedEntityList.direction == 'desc');
        
                angular.forEach(sortedTei, function(tei){
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

        $scope.completeSelectedEnrollments = function() {
            var modalOptions = {
                closeButtonText: 'no',
                actionButtonText: 'yes',
                headerText: 'complete_selected_enrollments',
                bodyText: 'are_you_sure_to_complete_selected_enrollments'
            };


            ModalService.showModal({}, modalOptions).then(function (result) {

                var selectedTeis = [];
                $scope.currentTrackedEntityList.data.rows.own.forEach(function(row){
                    if (row.checkBoxTicked) {
                        selectedTeis.push(row.id);
                    }
                });
                const programId = $scope.base.selectedProgram.id;
                TEIService.getActiveEnrollments(selectedTeis, programId, $scope.selectedOrgUnit.id).then(function(enrollments) {
                    enrollments.enrollments.forEach((enrollment) => enrollment.status = 'COMPLETED');
                    $http.post(DHIS2URL + '/enrollments', enrollments).then(function(){
                        $scope.setWorkingList($scope.currentTrackedEntityList.config);
                    });
                })
            });
        }
});
