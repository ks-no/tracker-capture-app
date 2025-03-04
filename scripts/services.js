/* global angular, moment, dhis2 */

'use strict';

/* Services */

var trackerCaptureServices = angular.module('trackerCaptureServices', ['ngResource'])

.filter('orderByKey', function(){
    var compareValues = function(key, order='asc') {
        return function(a, b) {
            if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
                // property doesn't exist on either object
                return 0; 
            }
        
            const varA = (typeof a[key] === 'string') ? 
                a[key].toUpperCase() : a[key];
            const varB = (typeof b[key] === 'string') ? 
                b[key].toUpperCase() : b[key];
        
            let comparison = 0;
            if (varA > varB) {
                comparison = 1;
            } else if (varA < varB) {
                comparison = -1;
            }
            return (
                (order == 'desc') ? (comparison * -1) : comparison
            );
        };
    }
    return function(array, key, direction){
        return array.sort(compareValues(key, direction));
    }
})

.factory('TCStorageService', function(){
    var store = new dhis2.storage.Store({
        name: "dhis2tc",
        adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
        objectStores: ['programs', 'trackedEntityTypes', 'attributes', 'relationshipTypes', 'optionSets', 'programIndicators', 'ouLevels', 'programRuleVariables', 'programRules','constants', 'dataElements', 'programAccess','programStageAccess','trackedEntityTypeAccess','optionGroups', 'organisationUnits']
    });
    return{
        currentStore: store
    };
})

/* Service to fetch/store dasboard widgets */
.service('DashboardLayoutService', function($http, DHIS2URL, NotificationService, $translate) {

    var ButtonIds = { Complete: "Complete", Incomplete: "Incomplete", Validate: "Validate", Delete: "Delete", Skip: "Skip", Unskip: "Unskip", Note: "Note" };

    var w = {};
    w.enrollmentWidget = {title: 'enrollment', view: "components/enrollment/enrollment.html", show: true, expand: true, parent: 'biggerWidget', order: 0};
    w.indicatorWidget = {title: 'indicators', view: "components/rulebound/rulebound.html", show: true, expand: true, parent: 'biggerWidget', order: 1, canBeUsedAsTopBar: true, topBarView: "components/rulebound/rulebound-topbar.html#indicators"};
    w.dataentryWidget = {title: 'dataentry', view: "components/dataentry/dataentry.html", show: true, expand: true, parent: 'biggerWidget', order: 2};
    w.dataentryTabularWidget = {title: 'dataentryTabular', view: "components/dataentry/dataentry-tabular-layout.html", show: false, expand: true, parent: 'biggerWidget', order: 3};
    w.reportWidget = {title: 'report', view: "components/report/tei-report.html", show: true, expand: true, parent: 'biggerWidget', order: 4};
    w.selectedWidget = {title: 'current_selections', view: "components/selected/selected.html", show: false, expand: true, parent: 'smallerWidget', order: 0};
    w.feedbackWidget = {title: 'feedback', view: "components/rulebound/rulebound.html", show: true, expand: true, parent: 'smallerWidget', order: 1,canBeUsedAsTopBar: true, topBarView: "components/rulebound/rulebound-topbar.html#feedback"};
    w.profileWidget = {title: 'profile', view: "components/profile/profile.html", show: true, expand: true, parent: 'smallerWidget', order: 2, canBeUsedAsTopBar: true, topBarView: "components/profile/profile-topbar.html"};
    w.relationshipWidget = {title: 'relationships', view: "components/relationship/relationship.html", show: true, expand: true, parent: 'smallerWidget', order: 3};
    w.notesWidget = {title: 'notes', view: "components/notes/notes.html", show: true, expand: true, parent: 'smallerWidget', order: 4};
    w.messagingWidget = {title: 'messaging', view: "components/messaging/messaging.html", show: false, expand: true, parent: 'smallerWidget', order: 5};
    var defaultLayout = new Object();

    defaultLayout['DEFAULT'] = {widgets: w, program: 'DEFAULT'};

    var programStageLayout = {};

    var getDefaultLayout = function(customLayout){
        var dashboardLayout = {customLayout: customLayout, defaultLayout: defaultLayout};
        var promise = $http.get(  DHIS2URL + '/dataStore/tracker-capture/keyTrackerDashboardDefaultLayout' ).then(function(response){
            angular.extend(dashboardLayout.defaultLayout, response.data);
            return dashboardLayout;
        }, function(){
            return dashboardLayout;
        });
        return promise;
    };

    return {
        saveLayout: function(dashboardLayout, saveAsDefault){
            if(saveAsDefault) {
                var url = DHIS2URL + '/dataStore/tracker-capture/keyTrackerDashboardDefaultLayout';
                var promise = $http({
                    method: "put",
                    url: url,
                    data: dashboardLayout,
                    headers: {'Content-Type': 'application/json'}
                }).then(function(response){
                    return response.data;
                },function(error){
                    var promise = $http({
                        method: "post",
                        url: url,
                        data: dashboardLayout,
                        headers: {'Content-Type': 'application/json'}
                    }).then(function(response){
                        return response.data;
                    },function(error){
                        var errorMsgHdr, errorMsgBody;
                        errorMsgHdr = $translate.instant("error");
                        if(saveAsDefault) {
                            errorMsgBody = $translate.instant("dashboard_layout_not_saved_as_default");
                        } else {
                            errorMsgBody = $translate.instant("dashboard_layout_not_saved");
                        }
                        NotificationService.showNotifcationDialog(errorMsgHdr, errorMsgBody);
                        return null;
                    });
                    return promise;
                });
                return promise;
            } else {
                var url = DHIS2URL + '/userSettings/keyTrackerDashboardLayout';
                var promise = $http({
                    method: "post",
                    url: url,
                    data: dashboardLayout,
                    headers: {'Content-Type': 'application/json'}
                }).then(function(response){
                    return response.data;
                },function(error){
                    var errorMsgHdr, errorMsgBody;
                    errorMsgHdr = $translate.instant("error");
                    if(saveAsDefault) {
                        errorMsgBody = $translate.instant("dashboard_layout_not_saved_as_default");
                    } else {
                        errorMsgBody = $translate.instant("dashboard_layout_not_saved");
                    }
                    NotificationService.showNotifcationDialog(errorMsgHdr, errorMsgBody);
                    return null;
                });
                return promise;
            }
        },
        get: function(){
            var promise = $http.get(  DHIS2URL + '/userSettings/keyTrackerDashboardLayout' ).then(function(response){
                return getDefaultLayout(response.data);
            }, function(){
                return getDefaultLayout(null);
            });
            return promise;
        },
        getLockedList: function() {
            var promise = $http.get(  DHIS2URL + '/dataStore/tracker-capture/keyDefaultLayoutLocked' ).then(function(response){
                return response.data;
            }, function(){
                return null;
            });
            return promise;
        },
        saveLockedList: function(list) {
            var url = DHIS2URL + '/dataStore/tracker-capture/keyDefaultLayoutLocked';
            var promise = $http({
                method: "put",
                url: url,
                data: list,
                headers: {'Content-Type': 'application/json'}
            }).then(function(response){
                return response.data;
            },function(error){
                var promise = $http({
                    method: "post",
                    url: url,
                    data: list,
                    headers: {'Content-Type': 'application/json'}
                }).then(function(response){
                    return response.data;
                },function(error){
                    return null;
                });
                return promise;
            });
            return promise;
        },
        getProgramStageLayout: function() {
            return programStageLayout;
        },
        setProgramStageLayout: function(layoutToSet) {
            programStageLayout = layoutToSet;
        }
    };
})

.service('DasboardWidgetService', function() {
    var dashboardUpdateCallback;
    var numberOfWidgetsReady = 0;
    return {
        registerDashboardUpdateCallback: function (callback) {
            numberOfWidgetsReady = 0;
            dashboardUpdateCallback = callback;
        },
        updateDashboard: function () {
            numberOfWidgetsReady++;
            dashboardUpdateCallback(numberOfWidgetsReady);
        }
    }
})

.service('RelationshipCallbackService', function() {
    var callbackArray = [];
    return {
        addCallback: function (callback) {
            callbackArray.push(callback);
        },
        clearCallbacks: function() {
            callbackArray = [];
        },
        runCallbackFunctions: function (relationships) {
            angular.forEach(callbackArray, (callback) => callback(relationships));
        }
    };
})

/* current selections */
.service('PeriodService', function(DateUtils, CalendarService, $filter){

    var calendarSetting = CalendarService.getSetting();

    var splitDate = function(dateValue){
        if(!dateValue){
            return;
        }
        var calendarSetting = CalendarService.getSetting();

        return {year: moment(dateValue, calendarSetting.momentFormat).year(), month: moment(dateValue, calendarSetting.momentFormat).month(), week: moment(dateValue, calendarSetting.momentFormat).week(), day: moment(dateValue, calendarSetting.momentFormat).day()};
    };

    function processPeriodsForEvent(periods,event){
        var index = -1;
        var occupied = null;
        for(var i=0; i<periods.length && index === -1; i++){
            if(moment(periods[i].endDate).isSame(event.sortingDate) ||
                moment(periods[i].startDate).isSame(event.sortingDate) ||
                moment(periods[i].endDate).isAfter(event.sortingDate) && moment(event.sortingDate).isAfter(periods[i].endDate)){
                index = i;
                occupied = angular.copy(periods[i]);
            }
        }

        if(index !== -1){
            periods.splice(index,1);
        }

        return {available: periods, occupied: occupied};
    };

    this.getPeriods = function(events, stage, enrollment, _periodOffset){

        if(!stage || !enrollment){
            return;
        }

        var referenceDate = enrollment.incidentDate ? enrollment.incidentDate : enrollment.enrollmentDate;
        var offset = stage.minDaysFromStart;

        if(stage.generatedByEnrollmentDate){
            referenceDate = enrollment.enrollmentDate;
        }

        var occupiedPeriods = [];
        var availablePeriods = [];
        var hasFuturePeriod = false;
        if(!stage.periodType){
            angular.forEach(events, function(event){
                occupiedPeriods.push({event: event.event, name: event.sortingDate, stage: stage.id});
            });
        }
        else{

            var startDate = DateUtils.format( moment(referenceDate, calendarSetting.momentFormat).add(offset, 'days') );
            var periodOffset = _periodOffset && dhis2.validation.isNumber( _periodOffset ) ? _periodOffset : splitDate(startDate).year - splitDate(DateUtils.getToday()).year;
            var eventDateOffSet = moment(referenceDate, calendarSetting.momentFormat).add('d', offset)._d;
            eventDateOffSet = $filter('date')(eventDateOffSet, calendarSetting.keyDateFormat);

            //generate availablePeriods
            var pt = new PeriodType();
            var d2Periods = pt.get(stage.periodType).generatePeriods({offset: periodOffset, filterFuturePeriods: false, reversePeriods: false});

            angular.forEach(d2Periods, function(p){
                p.endDate = DateUtils.formatFromApiToUser(p.endDate);
                p.startDate = DateUtils.formatFromApiToUser(p.startDate);

                if(moment(p.endDate, calendarSetting.momentFormat).isAfter(moment(eventDateOffSet,calendarSetting.momentFormat))){
                    availablePeriods.push( p );
                }

                if( !hasFuturePeriod && moment(p.endDate, calendarSetting.momentFormat).isAfter(DateUtils.getToday())){
                    hasFuturePeriod = true;
                }
            });

            //get occupied periods
            angular.forEach(events, function(event){
                var ps = processPeriodsForEvent(availablePeriods, event);
                availablePeriods = ps.available;
                if(ps.occupied){
                    occupiedPeriods.push(ps.occupied);
                }
            });
        }

        return {occupiedPeriods: occupiedPeriods, availablePeriods: availablePeriods, periodOffset: periodOffset, hasFuturePeriod: hasFuturePeriod};
    };

    this.managePeriods = function( periods, isNewEvent ){

        //remove future periods
        if( isNewEvent ){
            periods = $filter('removeFuturePeriod')(periods, {endDate: DateUtils.getToday()});
        }

        return periods;
    };
})

/* Factory to fetch optionSets */
.factory('OptionSetService', function($q, $rootScope, TCStorageService) {
    return {
        getAll: function(){

            var def = $q.defer();

            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.getAll('optionSets').done(function(optionSets){
                    $rootScope.$apply(function(){
                        def.resolve(optionSets);
                    });
                });
            });

            return def.promise;
        },
        get: function(uid){

            var def = $q.defer();

            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.get('optionSets', uid).done(function(optionSet){
                    $rootScope.$apply(function(){
                        def.resolve(optionSet);
                    });
                });
            });
            return def.promise;
        },
        getCode: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].displayName){
                        return options[i].code;
                    }
                }
            }
            return key;
        },
        getName: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].code){
                        return options[i].displayName;
                    }
                }
            }
            return key;
        }
    };
})

/* Factory to fetch relationships */
.factory('RelationshipFactory', function($q, $http, $rootScope, $translate, TCStorageService, NotificationService, $cookies) {
    var errorHeader = $translate.instant("error");
    return {
        getAll: function(){

            var def = $q.defer();

            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.getAll('relationshipTypes').done(function(relationshipTypes){
                    $rootScope.$apply(function(){
                        def.resolve(relationshipTypes);
                    });
                });
            });

            return def.promise;
        },
        get: function(uid){

            var def = $q.defer();

            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.get('relationshipTypes', uid).done(function(relationshipType){
                    $rootScope.$apply(function(){
                        def.resolve(relationshipType);
                    });
                });
            });
            return def.promise;
        },
        delete: function(uid){
           var promise = $http({method: 'DELETE', url: DHIS2URL + '/relationships/' +  uid, headers: {'ingress-csrf': $cookies['ingress-csrf']}})
                .then(function(response){
                    if(!response || !response.data || response.data.status !== 'OK'){
                        var errorBody = $translate.instant('failed_to_delete_relationship');
                        NotificationService.showNotifcationDialog(errorHeader, errorBody);
                        return $q.reject(errorBody);
                    }
                    return response && response.data;
                }, function(error) {
                    var errorBody = $translate.instant('failed_to_delete_relationship');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody);
                    return $q.reject(error);
                });
            return promise;
        }
    };
})

/* Factory to fetch programs */
.factory('ProgramFactory', function($q, $rootScope, $location, SessionStorageService, TCStorageService, orderByFilter, OrgUnitFactory, CommonUtils) {
    var access = null;
    return {
        get: function(uid){

            var def = $q.defer();

            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.get('programs', uid).done(function(pr){
                    $rootScope.$apply(function(){
                        def.resolve(pr);
                    });
                });
            });
            return def.promise;
        },
        getAllAccesses: function(){
            var def = $q.defer();
            if(access){
                def.resolve(access);
            }else{
                TCStorageService.currentStore.open().done(function(){
                    TCStorageService.currentStore.getAll('programAccess').done(function(programAccess){
                        access = { programsById: {}, programStagesById: {}, programIdNameMap: {}};
                        angular.forEach(programAccess, function(program){
                            access.programsById[program.id] = program.access;
                            access.programIdNameMap[program.id] = program.displayName;
                            angular.forEach(program.programStages, function(programStage){
                                access.programStagesById[programStage.id] = programStage.access;
                            });
                        });
                        def.resolve(access);
                    });
                });
            }
            return def.promise;
            
        },
        getAll: function(){
            var roles = SessionStorageService.get('USER_PROFILE');
            var userRoles = roles && roles.userCredentials && roles.userCredentials.userRoles ? roles.userCredentials.userRoles : [];
            var def = $q.defer();

            this.getAllAccesses().then(function(accesses){
                TCStorageService.currentStore.open().done(function(){
                    TCStorageService.currentStore.getAll('programs').done(function(prs){
                        var programs = [];
                        angular.forEach(prs, function(pr){
                            if(accesses.programsById[pr.id] && accesses.programsById[pr.id].data.read){
                                if(pr.programTrackedEntityAttributes){
                                    pr.programTrackedEntityAttributes = pr.programTrackedEntityAttributes.filter(function(attr){
                                        return attr.access && attr.access.read;
                                    });
                                }
                                pr.access = accesses.programsById[pr.id];
                                var accessiblePrs = [];
                                angular.forEach(pr.programStages, function(prs){
                                    if(accesses.programStagesById[prs.id] && accesses.programStagesById[prs.id].data.read){
                                        if(prs.programStageDataElements){
                                            prs.programStageDataElements = prs.programStageDataElements.filter(function(de){
                                                return de.access && de.access.read;
                                            });
                                        }
                                        prs.access = accesses.programStagesById[prs.id];
                                        accessiblePrs.push(prs);
                                    }
                                });
                                pr.programStages = accessiblePrs;
                                programs.push(pr);
                            }
                        });
                        programs = orderByFilter(programs, '-displayName').reverse();
    
                        $rootScope.$apply(function(){
                            def.resolve({programs: programs});
                        });
                    });
                });
            });
            return def.promise;
        },

        getProgramsByOu: function(ou,loadSelectedProgram, selectedProgram){
            var roles = SessionStorageService.get('USER_PROFILE');
            var userRoles = roles && roles.userCredentials && roles.userCredentials.userRoles ? roles.userCredentials.userRoles : [];
            var def = $q.defer();

            this.getAllAccesses().then(function(accesses){
                TCStorageService.currentStore.open().done(function(){
                    TCStorageService.currentStore.getAll('programs').done(function(prs){
                        var programs = [];
                        angular.forEach(prs, function(pr){
                            if(pr.organisationUnits.hasOwnProperty( ou.id ) && accesses.programsById[pr.id] && accesses.programsById[pr.id].data.read){
                                if(pr.programTrackedEntityAttributes){
                                    pr.programTrackedEntityAttributes = pr.programTrackedEntityAttributes.filter(function(attr){
                                        return attr.access && attr.access.read;
                                    });
                                }
                                pr.access = accesses.programsById[pr.id];
                                var accessiblePrs = [];
                                angular.forEach(pr.programStages, function(prs){
                                    if(accesses.programStagesById[prs.id] && accesses.programStagesById[prs.id].data.read){
                                        if(prs.programStageDataElements){
                                            prs.programStageDataElements = prs.programStageDataElements.filter(function(de){
                                                return de.access && de.access.read;
                                            });
                                        }
                                        prs.access = accesses.programStagesById[prs.id];
                                        accessiblePrs.push(prs);
                                    }
                                });
                                pr.allProgramStagesMetadataRead = pr.programStages;
                                pr.programStages = accessiblePrs;
                                programs.push(pr);
                            }
                        });
                        programs = orderByFilter(programs, '-displayName').reverse();
                        if(loadSelectedProgram){
                            if(programs.length === 0){
                                selectedProgram = null;
                            }
                            else if(programs.length === 1){
                                selectedProgram = programs[0];
                            }
                            else{
                                if(selectedProgram){
                                    var continueLoop = true;
                                    for(var i=0; i<programs.length && continueLoop; i++){
                                        if(programs[i].id === selectedProgram.id){
                                            selectedProgram = programs[i];
                                            continueLoop = false;
                                        }
                                    }
                                    if(continueLoop){
                                        selectedProgram = null;
                                    }
                                }
                            }
        
                            if(!selectedProgram || angular.isUndefined(selectedProgram) && programs.length > 0){
                                selectedProgram = programs[0];
                            }
                        }
    
                        $rootScope.$apply(function(){
                            def.resolve({programs: programs, selectedProgram: selectedProgram});
                        });
                    });
                });
            });
            return def.promise;
        },
        extendWithSearchGroups: function(programs, attributesById){
            angular.forEach(programs, function(program){
                var searchGroups = [];
                var group = { attributes: []};
                if(program.programAttributes){
                    angular.forEach(program.attributes, function(programAttribute){
                        var attr = attributesById[programAttribute.attribute];
                        if(attr.unique){
                            searchGroups.push({ attributes: [teAttribute]});
                        }else if(programAttribute.searchable){
                            group.attributes.push(programAttribute);
                        }
                    });
                }
            });
        }
    };
})

/* service to deal with TEI registration and update */
.service('RegistrationService', function(TEIService, $q){
    var convertFromUserToApi = function(tei){
        delete tei.enrollment;
        delete tei.programOwnersById;
        return tei;
    };

    return {
        registerOrUpdate: function(tei, optionSets, attributesById, programId){
            var apiTei = convertFromUserToApi(angular.copy(tei));
            if(apiTei){
                var def = $q.defer();
                if(apiTei.trackedEntityInstance){
                    TEIService.update(apiTei, optionSets, attributesById, programId).then(function(response){
                        def.resolve(response);
                    });
                }
                else{
                    TEIService.register(apiTei, optionSets, attributesById).then(function(response){
                        def.resolve(response);
                    });
                }
                return def.promise;
            }
        },
        processForm: function(existingTei, formTei, originalTei, attributesById){
            var tei = angular.copy(existingTei);
            tei.attributes = [];
            var formEmpty = true;
            for(var k in attributesById){
                if(originalTei && formTei[k] !== originalTei[k] && !formTei[k] && !originalTei[k]){
                    formChanged = true;
                }
                if( k in formTei ){
                    var att = attributesById[k];
                    tei.attributes.push({attribute: att.id, value: formTei[k], displayName: att.displayName, valueType: att.valueType});
                    formEmpty = false;
                }
                delete tei[k];
            }
            formTei.attributes = tei.attributes;

            var formChanged = false;
            for(var k in attributesById){
                if(originalTei && formTei[k] !== originalTei[k]){
                    if(!formEmpty){
                        formChanged = true;
                        break;
                    }
                    if(formEmpty && (formTei[k] || originalTei[k]) ){
                        formChanged = true;
                        break;
                    }
                }
            }
            if (originalTei) {
                angular.forEach(originalTei.attributes, function (att) {
                    if (tei[att.attribute]) {
                        delete tei[att.attribute];
                    }
                });
            }
            return {tei: tei, formEmpty: formEmpty, formChanged: formChanged};
        }
    };
})

/* Service to deal with enrollment */
.service('EnrollmentService', function($http, DHIS2URL, DateUtils, NotificationService, $translate, TeiAccessApiService, $cookies) {

    var convertFromApiToUser = function(enrollment){
        if(enrollment.enrollments){
            angular.forEach(enrollment.enrollments, function(enrollment){
                enrollment.incidentDate = DateUtils.formatFromApiToUser(enrollment.incidentDate);
                enrollment.enrollmentDate = DateUtils.formatFromApiToUser(enrollment.enrollmentDate);
            });
        }
        else{
            enrollment.incidentDate = DateUtils.formatFromApiToUser(enrollment.incidentDate);
            enrollment.enrollmentDate = DateUtils.formatFromApiToUser(enrollment.enrollmentDate);
        }

        return enrollment;
    };
    var convertFromUserToApi = function(enrollment){
        enrollment.incidentDate = DateUtils.formatFromUserToApi(enrollment.incidentDate);
        enrollment.enrollmentDate = DateUtils.formatFromUserToApi(enrollment.enrollmentDate);
        delete enrollment.orgUnitName;
        delete enrollment.events;
        return enrollment;
    };
    var errorHeader = $translate.instant("error");
    return {
        get: function( enrollmentUid,teiUid, programUid){
            var url = DHIS2URL + '/enrollments/' + enrollmentUid;
            return TeiAccessApiService.get(teiUid, programUid, url).then(function(response){
                return convertFromApiToUser(response.data);
            }, function(response){
                var errorBody = $translate.instant('failed_to_fetch_enrollment');
                if (response && response.data && response.data.status === 'ERROR') {
                    if (response.data.message) {
                        errorBody = response.data.message
                    }
                }
                NotificationService.showNotifcationDialog(errorHeader, errorBody);
                return null;
            });
        },
        getByEntity: function( entity ){
            var promise = $http({method: 'GET', url: DHIS2URL + '/enrollments.json?ouMode=ACCESSIBLE&trackedEntityInstance=' + entity + '&fields=:all&paging=false', headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return convertFromApiToUser(response.data);
            },function(response){
                var errorBody = $translate.instant('failed_to_fetch_enrollment');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        getByEntityAndProgram: function( entity, program ){
            var url = DHIS2URL + '/enrollments.json?ouMode=ACCESSIBLE&trackedEntityInstance=' + entity + '&program=' + program + '&fields=:all&paging=false';
            var promise = TeiAccessApiService.get(entity,program,url).then(function(response){
                return convertFromApiToUser(response.data);
            }, function(response){
                var errorBody = $translate.instant('failed_to_fetch_enrollment');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        getByStartAndEndDate: function( program, orgUnit, ouMode, startDate, endDate ){
            var promise = $http({method: 'GET', url: DHIS2URL + '/enrollments.json?ouMode=ACCESSIBLE&program=' + program + '&orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&startDate=' + startDate + '&endDate=' + endDate + '&fields=:all&paging=false', headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return convertFromApiToUser(response.data);
            }, function(response){
                var errorBody = $translate.instant('failed_to_fetch_enrollment');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        enroll: function( enrollment ){
            var en = convertFromUserToApi(angular.copy(enrollment));
            var promise = TeiAccessApiService.post(enrollment.trackedEntityInstance, enrollment.program,  DHIS2URL + '/enrollments', en ).then(function(response){
                return response.data;
            }, function(response){
                var errorBody = $translate.instant('failed_to_save_enrollment');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        update: function( enrollment ){
            var en = convertFromUserToApi(angular.copy(enrollment));
            delete en.notes;
            var promise = TeiAccessApiService.put(enrollment.trackedEntityInstance, enrollment.program, DHIS2URL + '/enrollments/' + en.enrollment , en ).then(function(response){
                return response.data;
            }, function(response){
                var errorBody = $translate.instant('failed_to_update_enrollment');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        delete: function(enrollment){
            var promise = TeiAccessApiService.delete(enrollment.trackedEntityInstance, enrollment.program, DHIS2URL + '/enrollments/' + enrollment.enrollment).then(function(response){
                return response.data;
            }, function (response) {
                if (response && response.data && response.data.status === 'ERROR') {
                    var errorBody = $translate.instant('failed_to_delete_enrollment');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                }

                return response.data;
            });
            return promise;
        },
        updateForNote: function( enrollment ){
            var promise = TeiAccessApiService.post(enrollment.trackedEntityInstance, enrollment.program, DHIS2URL + '/enrollments/' + enrollment.enrollment + '/note', enrollment).then(function(response){
                return response.data;
            }, function(response){
                var errorBody = $translate.instant('failed_to_update_enrollment');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        }
    };
})
.factory('EnrollmentUtils', function(){
    return {
        isExpired: function(program, enrollment){

        }
    }
})


.factory('TeiAccessApiService', function($http,$q,$modal, $cookies){
    var auditCancelledSettings = {};
    var needAuditError = {
        code: 401,
        message: "OWNERSHIP_ACCESS_DENIED"
    }
    var modalDefaultSettings = {
        templateUrl: 'components/teiAudit/tei-audit.html',
        controller: 'TeiAuditController'
    }
    var getModalSettings = function(tei,program){
        return {
            templateUrl: 'components/teiAudit/tei-audit.html',
            controller: 'TeiAuditController',
            resolve: {
                tei: function(){
                    return tei;
                },
                program: function(){
                    return program;
                },
                auditCancelledSettings: function(){
                    return auditCancelledSettings
                }
            }
        }
    }

    var handleSuccess = function(response){
        return response;
    }
    var handleError = function(error,tei,program, postAuditApiFn){
        if(error && error.data && error.data.httpStatusCode === needAuditError.code && error.data.message === needAuditError.message){
            return handleAudit(tei,program,postAuditApiFn);
        }else{
            var def = $q.defer();
            def.reject(error);
            return def.promise;
        }
    }

    var saveAuditMessage = function(tei,program,auditMessage){
        var obj = {}; /*{
            tei: tei,
            program: program,
            reason: auditMessage
        }*/
        return $http({
                method: 'POST',
                url: DHIS2URL+'/tracker/ownership/override?trackedEntityInstance='+tei+'&program='+program+'&reason='+auditMessage,
                data: obj,
                headers: {'ingress-csrf': $cookies['ingress-csrf']}
            });
    }

    var handleAudit = function(tei,program, postAuditApiFn){
        return $modal.open(getModalSettings(tei,program)).result.then(function(result){
            return saveAuditMessage(tei,program,result.auditMessage).then(function(result){
                return callApi(postAuditApiFn, tei,program);
            }, function(error){
                var def = $q.defer();
                def.reject(error);
                return def.promise;
            });
        }, function(error){
            var def = $q.defer();
            def.reject(error);
            return def.promise;
        });
    }

    var service = {};

    var callApi = function(apiFn,tei,program){        
        return apiFn().then(function(response){
            return response;
        },function(error){
            return handleError(error,tei,program, apiFn);
        });
    }

    service.setAuditCancelledSettings = function(settings){
        auditCancelledSettings = settings;
    }
    service.get = function(tei, program, url){
        return callApi(function() { return $http({method: 'GET', url: url, headers: {'ingress-csrf': $cookies['ingress-csrf']} }) }, tei, program);
    }

    service.post = function(tei,program,url, data){
        return callApi(function() { return $http({method: 'POST', url: url, data: data, headers: {'ingress-csrf': $cookies['ingress-csrf']}}) }, tei, program);
    }

    service.put = function(tei,program,url, data){
        return callApi(function() { return $http({method: 'PUT', url: url, data: data, headers: {'ingress-csrf': $cookies['ingress-csrf']}}) }, tei, program);
    }

    service.delete = function(tei,program,url, data){
        return callApi(function() { return $http({method: 'DELETE', url: url, data: data, headers: {'ingress-csrf': $cookies['ingress-csrf']}}) }, tei, program);
    }
    return service;
})
/* Service for getting tracked entity */
.factory('TEService', function(TCStorageService, $q, $rootScope, AttributesFactory) {
    var allAccesses = null;
    return {
        getAll: function(){
            var def = $q.defer();

            TCStorageService.currentStore.open().done(function(){

                TCStorageService.currentStore.getAll('trackedEntityTypes').done(function(entities){
                    $rootScope.$apply(function(){
                        
                        def.resolve(entities);
                    });
                });
            });
            return def.promise;

        },
        get: function(uid){
            var def = $q.defer();
            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.get('trackedEntityTypes', uid).done(function(te){
                    def.resolve(te);
                });
            });
            return def.promise;
        },
        extendWithSearchGroups: function(trackedEntityTypes, attributesById){
            angular.forEach(trackedEntityTypes, function(te){
                var searchGroups = [];
                var group = { attributes: []};
                if(te.attributes){
                    angular.forEach(te.attributes, function(teAttribute){
                        var attr = attributesById[teAttribute.attribute];
                        var searchAttribute = teAttribute;
                        searchAttribute.attribute = angular.copy(attr);
                        if(attr.unique){
                            searchGroups.push({ attributes: [searchAttribute]});
                        }else if(searchAttribute.searchable){
                            group.attributes.push(searchAttribute);
                        }
                    });
                }
            });
        }
    };
})

/* Service for getting tracked entity instances */
.factory('TEIService', function($http, orderByFilter, $translate, DHIS2URL, $q, AttributesFactory, CommonUtils, CurrentSelection, DateUtils, NotificationService, TeiAccessApiService, $cookies) {
    var cachedTeiWithProgramData = null;
    var errorHeader = $translate.instant("error");
    var getSearchUrl = function(type,ouId, ouMode, queryUrl, programOrTETUrl, attributeUrl, pager, paging, format){
        var baseUrl = DHIS2URL + '/trackedEntityInstances/'+type;
        var url = baseUrl;
        var deferred = $q.defer();
        
        if (format === "csv") {
            url = url+'.csv?ou=' + ouId + '&ouMode=' + ouMode;
        } else if (format === "xml") {
            url = url+'.json?ou=' + ouId + '&ouMode=' + ouMode;
        }else {
            url = url+'.json?ou=' + ouId + '&ouMode=' + ouMode;
        }

        if(queryUrl){
            url = url + '&'+ queryUrl;
        }
        if(programOrTETUrl){
            url = url + '&' + programOrTETUrl;
        }
        if(attributeUrl){
            url = url + '&' + attributeUrl;
        }
        if(paging){
            var pgSize = (pager && pager.pageSize) || 50;
            var pg = (pager && pager.page) || 1;
            pgSize = pgSize > 1 ? pgSize  : 1;
            pg = pg > 1 ? pg : 1;
            url = url + '&pageSize=' + pgSize + '&page=' + pg;
            // Not getting totalPages causes unpredictable bugs. Override and always get totalPages
            if(pager && pager.skipTotalPages) {
                url+= '&totalPages=true';
            }else{
                url+= '&totalPages=true';
            }
        }
        else{
            url = url + '&paging=false';
        }
        return url;
    }
    var setTeiAttributeValues = function(teiAttributes, optionSets, attributesById){
        teiAttributes.forEach(function(att) {
            if(attributesById[att.attribute]){
                att.displayName = attributesById[att.attribute].displayName;
                att.value = CommonUtils.formatDataValue(null, att.value, attributesById[att.attribute], optionSets, 'USER');
            }
        });
    }

    var convertFromUserToApi = function(tei){
        delete tei.enrollments;
        delete tei.programOwnersById;
        return tei;
    }
    return {
        getWithProgramData: function(entityUid,programUid, optionSets, attributesById, useCached){
            if(useCached && cachedTeiWithProgramData && cachedTeiWithProgramData.entityUid === entityUid && cachedTeiWithProgramData.programUid === programUid){
                var def = $q.defer();
                def.resolve(cachedTeiWithProgramData.data);
                return def.promise;
            }
            return TeiAccessApiService.get(entityUid, programUid, DHIS2URL+'/trackedEntityInstances/'+entityUid+'.json?program='+programUid+'&fields=*').then(function(response){
                var tei = response.data;
                setTeiAttributeValues(tei.attributes, optionSets, attributesById);
                if(tei.enrollments){
                    tei.enrollments.forEach(function(e) {
                        e.incidentDate = DateUtils.formatFromApiToUser(e.incidentDate);
                        e.enrollmentDate = DateUtils.formatFromApiToUser(e.enrollmentDate);
                    });
                }
                if(tei.programOwners){
                    tei.programOwnersById = tei.programOwners.reduce(function(map,po) {
                        map[po.program] = po.ownerOrgUnit;
                        return map;
                    }, {});
                }

                cachedTeiWithProgramData = {
                    entityUid: entityUid,
                    programUid: programUid,
                    data: tei
                }

                return tei;
            }, function(error){
                var def = $q.defer();
                def.reject(error);
                return def.promise;
            });
        },
        getListWithProgramData: function(entityUidList, programUid, dataElementId, programStageId, orgUnitId, transferStageId){
            if(entityUidList && entityUidList.length > 0){
                return TeiAccessApiService.get(null, programUid, DHIS2URL+'/trackedEntityInstances.json?trackedEntityInstance='+entityUidList.join(';')+'&paging=false&program='+programUid+'&ou=' + orgUnitId + '&fields=trackedEntityInstance,orgUnit,enrollments[enrollment,program,enrollmentDate,events[status,dataValues,programStage,eventDate]]').then(function(response){
                    var teiDictionary = {};
                    if(response.data && response.data.trackedEntityInstances && response.data.trackedEntityInstances.length > 0){
                        response.data.trackedEntityInstances.forEach(function(tei) {
                            teiDictionary[tei.trackedEntityInstance] = {orgUnit: tei.orgUnit};
                            if(tei.enrollments){
                                tei.enrollments = orderByFilter(tei.enrollments, '+enrollmentDate');
                                tei.enrollments.forEach(function(enrollment) {

                                    if(enrollment.program == programUid) {
                                        teiDictionary[tei.trackedEntityInstance].enrollmentDate = enrollment.enrollmentDate;
                                    }

                                    if(enrollment.events && enrollment.events.length > 0){
                                        enrollment.events = orderByFilter(enrollment.events, '+eventDate');
                                        enrollment.events.forEach(function(event){
                                            if(event.programStage == programStageId && event.dataValues && event.dataValues.length > 0) {
                                                event.dataValues.forEach(function(dataValue){
                                                    if(dataValue.dataElement == dataElementId) {
                                                        teiDictionary[tei.trackedEntityInstance].dataValue = dataValue.value;
                                                        teiDictionary[tei.trackedEntityInstance].eventDate = event.eventDate;
                                                    }
                                                });
                                            }
                                            if(event.programStage == transferStageId) {
                                                teiDictionary[tei.trackedEntityInstance].transferStatus = event.status;
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
    
                    return teiDictionary;
                }, function(error){
                    var def = $q.defer();
                    def.reject(error);
                    return def.promise;
                });
            } else {
                var def = $q.defer();
                def.resolve([]);
                return def.promise;
            }
        },
        getActiveEnrollments: function(entityUidList, programUid, orgUnitId) {
            if(entityUidList && entityUidList.length > 0){
                return TeiAccessApiService.get(null, programUid, DHIS2URL+'/trackedEntityInstances.json?trackedEntityInstance='+entityUidList.join(';')+'&paging=false&program='+programUid+'&ou=' + orgUnitId + '&programStatus=ACTIVE&fields=trackedEntityInstance,enrollments[enrollment]').then(function(response){
                    var data = { enrollments: [] }
                    var enrollments = data.enrollments;
                    if (response.data && response.data.trackedEntityInstances && response.data.trackedEntityInstances.length > 0){
                        response.data.trackedEntityInstances.forEach(function(tei) {
                            enrollments.push({
                                program: programUid,
                                enrollment: tei.enrollments[0].enrollment,
                                trackedEntityInstance: tei.trackedEntityInstance
                            });
                        });
                    }
                    return data;
                }, function(error){
                    var def = $q.defer();
                    def.reject(error);
                    return def.promise;
                });
            } else {
                var def = $q.defer();
                def.resolve([]);
                return def.promise;
            }
        },
        get: function(entityUid, optionSets, attributesById){
           var promise = $http({method: 'GET', url: DHIS2URL + '/trackedEntityInstances/' +  entityUid + '.json', headers: {'ingress-csrf': $cookies['ingress-csrf']} }).then(function(response){
                var tei = response.data;
                setTeiAttributeValues(tei.attributes, optionSets, attributesById);
                return tei;
            }, function(error){
                if(error){
                    var headerText = errorHeader;
                    var bodyText = $translate.instant('access_denied');

                    if(error.statusText) {
                        headerText = error.statusText;
                    }
                    if(error.data && error.data.message) {
                        bodyText = error.data.message;
                    }
                    NotificationService.showNotifcationDialog( headerText,  bodyText);
                }
            });

            return promise;
        },
        getRelationships: function(uid) {
            var promise = $http({method: 'GET', url: DHIS2URL + '/trackedEntityInstances/' + uid + '.json?fields=relationships', headers: {'ingress-csrf': $cookies['ingress-csrf']} }).then(function(response){
                var tei = response.data;
                return tei.relationships;
            });
            return promise;
        },
        getTeiWithAllAvailableFields: function(entityUid, optionSets, attributesById) {
            var promise = $http({method: 'GET', url: DHIS2URL + '/trackedEntityInstances/' +  entityUid + '.json?fields=*', headers: {'ingress-csrf': $cookies['ingress-csrf']} }).then(function(response){
                var tei = response.data;
                setTeiAttributeValues(tei.attributes, optionSets, attributesById);
                return tei;
            }, function(error){
                if(error){
                    var headerText = errorHeader;
                    var bodyText = $translate.instant('access_denied');

                    if(error.statusText) {
                        headerText = error.statusText;
                    }
                    if(error.data && error.data.message) {
                        bodyText = error.data.message;
                    }
                    NotificationService.showNotifcationDialog( headerText,  bodyText);
                }
            });

            return promise;
        },

        saveRelationship: function(relationship) {
            var promise = $http({method: 'POST', url:  DHIS2URL + '/relationships', data: relationship, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return response.data;
            });
            return promise;
        },
        getPotentialDuplicates: function(uidList) {
            var uidUrl = "";
            if(uidList.length > 0)
            {
                uidUrl += "?teis=";
                for(var i = 0; i < uidList.length; i ++){
                    if(i > 0) uidUrl += ",";
                    uidUrl += uidList[i];
                }
            }
            var promise = $http({method: 'GET', url: DHIS2URL + '/potentialDuplicates' + uidUrl, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return response.data;
            });
            return promise;
        },
        getPotentialDuplicatesForTei: function(uid) {
            var promise = $http({method: 'GET', url: DHIS2URL + '/potentialDuplicates?teis=' + uid, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return response.data;
            });
            return promise;
        },
        markPotentialDuplicate: function(tei) {
            var promise = $http({method: 'POST', url: DHIS2URL + '/potentialDuplicates/', data: {teiA:tei.id}, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return response.data;
            });
            return promise;
        },
        deletePotentialDuplicate: function(duplicate) {
            var promise = $http({method: 'DELETE', url: DHIS2URL + '/potentialDuplicates/' + duplicate.id, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return response.data;
            });
            return promise;
        },
        delete: function(entityUid){
            var promise = $http({method: 'DELETE', url: DHIS2URL + '/trackedEntityInstances/' + entityUid, headers: {'ingress-csrf': $cookies['ingress-csrf']} }).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody;
                if (response && response.data && response.data.status === 'ERROR') {
                    errorBody = $translate.instant('delete_error_audit');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                }

                return response.data;
            });
            return promise;
        },
        searchCount: function(ouId, ouMode, queryUrl, programOrTETUrl, attributeUrl, pager, paging, format){
            var url = getSearchUrl("count",ouId, ouMode,queryUrl, programOrTETUrl, attributeUrl, pager, paging, format);
            return $http({method: 'GET', url: url, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response)
            {
                if(response && response.data) return response.data;
                return 0;
            });
        },
        search: function(ouId, ouMode, queryUrl, programOrTETUrl, attributeUrl, pager, paging, format, attributesList, attrNamesIdMap, optionSets) {
            var deferred = $q.defer();
            var url = getSearchUrl("query",ouId, ouMode,queryUrl, programOrTETUrl, attributeUrl, pager, paging, format);
            $http({method: 'GET', url: url, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                var xmlData, rows, headers, index, itemName, value, jsonData;
                var trackedEntityInstance, attributesById;
                if (format) {
                    attributesById = CurrentSelection.getAttributesById();
                    if (format === "json") {
                        jsonData = {"trackedEntityInstances": []};
                        rows = response.data.rows;
                        headers = response.data.headers;
                        for (var i = 0; i < rows.length; i++) {
                            trackedEntityInstance = null;
                            for (var j = 0; j < rows[i].length; j++) {
                                index = attributesList.indexOf(headers[j].name);
                                itemName = headers[j].column;
                                value = rows[i][j].replace(/&/g, "&amp;");
                                if (attributesById[headers[j].name]) {
                                    value = CommonUtils.formatDataValue(null, value, attributesById[headers[j].name], optionSets, 'USER');
                                } else if ((headers[j].name === "created") || ((headers[j].name === "lastupdated"))) {
                                    value = DateUtils.formatFromApiToUser(value);
                                }

                                if (trackedEntityInstance === null) {
                                    trackedEntityInstance = {};
                                }

                                if (index > -1) {
                                    if (!trackedEntityInstance["attributes"]) {
                                        trackedEntityInstance["attributes"] = [];
                                    }
                                    trackedEntityInstance["attributes"].push({
                                        id: attrNamesIdMap[itemName], name: itemName,
                                        value: value
                                    });
                                } else {
                                    trackedEntityInstance[headers[j].name] = value;
                                }
                            }
                            if (trackedEntityInstance !== null) {
                                jsonData["trackedEntityInstances"].push(trackedEntityInstance);
                            }
                        }
                        if (jsonData) {
                            deferred.resolve(JSON.stringify(jsonData, null, 2));
                        }
                    } else if (format === "xml") {
                        xmlData = "";
                        if (response.data && response.data.rows) {
                            xmlData += "<trackedEntityInstances>";
                            rows = response.data.rows;
                            headers = response.data.headers;
                            for (var i = 0; i < rows.length; i++) {
                                xmlData += "<trackedEntityInstance>";
                                for (var j = 0; j < rows[i].length; j++) {
                                    index = attributesList.indexOf(headers[j].name);
                                    itemName = headers[j].column;
                                    value = rows[i][j].replace(/&/g, "&amp;");
                                    if (attributesById[headers[j].name]) {
                                        value = CommonUtils.formatDataValue(null, value, attributesById[headers[j].name], optionSets, 'USER');
                                    } else if ((headers[j].name === "created") || ((headers[j].name === "lastupdated"))) {
                                        value = DateUtils.formatFromApiToUser(value);
                                    }
                                    if (index > -1) {
                                        xmlData += '<attribute id="' + attrNamesIdMap[itemName] + '" ' +
                                            'name="' + itemName + '" value="' + value + '"></attribute>';
                                    } else {
                                        xmlData += '<' + headers[j].name + ' value="' + value + '"></' + headers[j].name + '>';
                                    }

                                }
                                xmlData += "</trackedEntityInstance>";

                            }
                            xmlData += "</trackedEntityInstances>";
                            deferred.resolve(xmlData);
                        }
                    } else if (format === "csv") {
                        deferred.resolve(response.data);
                    }
                } else {
                    deferred.resolve(response.data);
                }
            }, function(error){
                if(error && error.status === 403){
                    NotificationService.showNotifcationDialog( $translate.instant('error'),  $translate.instant('access_denied'));
                }
                deferred.reject(error);
            });
            return deferred.promise;
        },
        update: function(tei, optionSets, attributesById, programId){
            var formattedTei = convertFromUserToApi(angular.copy(tei));
            var attributes = [];
            angular.forEach(formattedTei.attributes, function(att){
                if(att && att.attribute) {
                    attributes.push({
                        attribute: att.attribute,
                        value: CommonUtils.formatDataValue(null, att.value, attributesById[att.attribute], optionSets, 'API')
                    });
                }
            });
            formattedTei.attributes = attributes;
            var programFilter = programId ? "?program=" + programId : "";
            var promise = $http({method: 'PUT', url: DHIS2URL + '/trackedEntityInstances/' + formattedTei.trackedEntityInstance + programFilter, data: formattedTei, headers: {'ingress-csrf': $cookies['ingress-csrf']} }).then(function(response){
                return response.data;
            }, function(response){
                NotificationService.showNotifcationDialog($translate.instant('update_error'), $translate.instant('failed_to_update_tei'), response);
                return null;
            });
            return promise;
        },
        register: function(tei, optionSets, attributesById){
            var formattedTei = convertFromUserToApi(angular.copy(tei));
            var attributes = [];
            angular.forEach(formattedTei.attributes, function(att){
                attributes.push({attribute: att.attribute, value: CommonUtils.formatDataValue(null, att.value, attributesById[att.attribute], optionSets, 'API')});
            });

            formattedTei.attributes = attributes;
            var promise = $http({method: 'POST', url: DHIS2URL + '/trackedEntityInstances', data: formattedTei, headers: {'ingress-csrf': $cookies['ingress-csrf']} }).then(function(response){
                return response.data;
            }, function(response){
                return response.data;
            });
            return promise;
        },
        processAttributes: function(selectedTei, selectedProgram, selectedEnrollment){
            var def = $q.defer();
            if(selectedTei.attributes){
                if(selectedProgram && selectedEnrollment){
                    //show attribute for selected program and enrollment
                    AttributesFactory.getByProgram(selectedProgram).then(function(atts){
                        selectedTei.attributes = AttributesFactory.showRequiredAttributes(atts,selectedTei.attributes, true);
                        def.resolve(selectedTei);
                    });
                }
                if(selectedProgram && !selectedEnrollment){
                    //show attributes for selected program
                    AttributesFactory.getByProgram(selectedProgram).then(function(atts){
                        selectedTei.attributes = AttributesFactory.showRequiredAttributes(atts,selectedTei.attributes, false);
                        def.resolve(selectedTei);
                    });
                }
                if(!selectedProgram && !selectedEnrollment){
                    //show attributes in no program
                    AttributesFactory.getWithoutProgram().then(function(atts){
                        selectedTei.attributes = AttributesFactory.showRequiredAttributes(atts,selectedTei.attributes, false);
                        def.resolve(selectedTei);
                    });
                }
            }
            return def.promise;
        },
        changeTeiProgramOwner: function(tei, program,ou){
            CurrentSelection.currentSelection.tei.programOwnersById[program] = ou;
            var url =  DHIS2URL+'/tracker/ownership/transfer?trackedEntityInstance='+tei+'&program='+program+'&ou='+ou;
            return $http({method: 'PUT', url: url, data: {}, headers: {'ingress-csrf': $cookies['ingress-csrf']}});
        }
    };
})

/* Factory for getting tracked entity attributes */
.factory('AttributesFactory', function($q, $rootScope, TCStorageService, orderByFilter, DateUtils, OptionSetService, OperatorFactory) {

    return {
        getAll: function(){

            var def = $q.defer();

            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.getAll('attributes').done(function(attributes){
                    $rootScope.$apply(function(){
                        def.resolve(attributes);
                    });
                });
            });
            return def.promise;
        },
        getByProgram: function(program){
            var def = $q.defer();
            this.getAll().then(function(atts){

                if(program && program.id){
                    var attributes = [];
                    var programAttributes = [];
                    angular.forEach(atts, function(attribute){
                        attributes[attribute.id] = attribute;
                    });

                    angular.forEach(program.programTrackedEntityAttributes, function(pAttribute){
                        var att = attributes[pAttribute.trackedEntityAttribute.id];
                        att.programTrackedEntityAttribute = pAttribute;
                        if (att) {
                            att.mandatory = pAttribute.mandatory;
                            att.displayInListNoProgram = pAttribute.displayInList;
                            
                            if(pAttribute.renderOptionsAsRadio){
                                att.renderOptionsAsRadio = pAttribute.renderOptionsAsRadio;
                            }
                            if(pAttribute.searchable)
                            {
                                att.searchable = pAttribute.searchable;
                            }
                            att.allowFutureDate = pAttribute.allowFutureDate;
                            programAttributes.push(att);
                        }
                    });

                    def.resolve(programAttributes);
                }
                else{
                    var attributes = [];
                    angular.forEach(atts, function(attribute){
                        if (attribute.displayInListNoProgram) {
                            attributes.push(attribute);
                        }
                    });

                    attributes = orderByFilter(attributes, '-sortOrderInListNoProgram').reverse();
                    def.resolve(attributes);
                }
            });
            return def.promise;
        },
        getByTrackedEntityType: function(trackedEntityType){
            var def = $q.defer();
            this.getAll().then(function(atts){

                if(trackedEntityType && trackedEntityType.id){
                    var attributes = [];
                    var trackedEntityTypeAttributes = [];
                    angular.forEach(atts, function(attribute){
                        attributes[attribute.id] = attribute;
                    });

                    angular.forEach(trackedEntityType.trackedEntityTypeAttributes, function(teAttribute){
                        var att = attributes[teAttribute.trackedEntityAttribute.id];
                        if (att) {
                            att.mandatory = teAttribute.mandatory;
                            if (teAttribute.displayInList) {
                                att.displayInListNoProgram = true;
                            }
                            if(teAttribute.renderOptionsAsRadio){
                                att.renderOptionsAsRadio = teAttribute.renderOptionsAsRadio;
                            }
                            if(teAttribute.searchable)
                            {
                                att.searchable = teAttribute.searchable;
                            }
                            trackedEntityTypeAttributes.push(att);
                        }
                    });

                    def.resolve(trackedEntityTypeAttributes);
                }
                else{
                    var attributes = [];
                    angular.forEach(atts, function(attribute){
                        if (attribute.displayInListNoProgram) {
                            attributes.push(attribute);
                        }
                    });

                    attributes = orderByFilter(attributes, '-sortOrderInListNoProgram').reverse();
                    def.resolve(attributes);
                }
            });
            return def.promise;
        },
        getWithoutProgram: function(){

            var def = $q.defer();
            this.getAll().then(function(atts){
                var attributes = [];
                angular.forEach(atts, function(attribute){
                    if (attribute.displayInListNoProgram) {
                        attributes.push(attribute);
                    }
                });
                def.resolve(attributes);
            });
            return def.promise;
        },
        getMissingAttributesForEnrollment: function(tei, program){
            var def = $q.defer();
            this.getByProgram(program).then(function(atts){
                var programAttributes = atts;
                var existingAttributes = tei.attributes;
                var missingAttributes = [];

                for(var i=0; i<programAttributes.length; i++){
                    var exists = false;
                    for(var j=0; j<existingAttributes.length && !exists; j++){
                        if(programAttributes[i].id === existingAttributes[j].attribute){
                            exists = true;
                        }
                    }
                    if(!exists){
                        missingAttributes.push(programAttributes[i]);
                    }
                }
                def.resolve(missingAttributes);
            });
            return def.promise();
        },
        showRequiredAttributes: function(requiredAttributes, teiAttributes, fromEnrollment){

            //first reset teiAttributes
            for(var j=0; j<teiAttributes.length; j++){
                teiAttributes[j].show = false;
            }

            //identify which ones to show
            for(var i=0; i<requiredAttributes.length; i++){
                var processed = false;
                for(var j=0; j<teiAttributes.length && !processed; j++){
                    if(requiredAttributes[i].id === teiAttributes[j].attribute){
                        processed = true;
                        teiAttributes[j].show = true;
                        teiAttributes[j].order = i;
                        teiAttributes[j].mandatory = requiredAttributes[i].mandatory ? requiredAttributes[i].mandatory : false;
                        teiAttributes[j].allowFutureDate = requiredAttributes[i].allowFutureDate ? requiredAttributes[i].allowFutureDate : false;
                        teiAttributes[j].displayName = requiredAttributes[i].displayName;
                    }
                }

                if(!processed && fromEnrollment){//attribute was empty, so a chance to put some value
                    teiAttributes.push({show: true, order: i, allowFutureDate: requiredAttributes[i].allowFutureDate ? requiredAttributes[i].allowFutureDate : false, mandatory: requiredAttributes[i].mandatory ? requiredAttributes[i].mandatory : false, attribute: requiredAttributes[i].id, displayName: requiredAttributes[i].displayName, type: requiredAttributes[i].valueType, value: ''});
                }
            }

            teiAttributes = orderByFilter(teiAttributes, '-order');
            teiAttributes.reverse();
            return teiAttributes;
        },
        generateAttributeFilters: function(attributes){
            angular.forEach(attributes, function(attribute){
                if(attribute.valueType === 'NUMBER' || attribute.valueType === 'DATE' || attribute.valueType === 'DATETIME'){
                    attribute.operator = OperatorFactory.defaultOperators[0];
                }
            });
            return attributes;
        }
    };
})

/* factory for handling events */
.factory('DHIS2EventFactory', function($http, DHIS2URL, NotificationService, $translate, TeiAccessApiService, $cookies) {

    var skipPaging = "&skipPaging=true";
    var errorHeader = $translate.instant("error");

    var getContextEvent = function(dhis2Event){
        if(Array.isArray(dhis2Event)){
            return dhis2Event[0];
        }
        return dhis2Event;
    }

    return {

        getEventsByStatus: function(entity, orgUnit, program, programStatus){
            var promise = TeiAccessApiService.get(entity,program, DHIS2URL + '/events.json?ouMode=ACCESSIBLE&' + 'trackedEntityInstance=' + entity + '&orgUnit=' + orgUnit + '&program=' + program + '&programStatus=' + programStatus  + skipPaging).then(function(response){
                return response.data.events;
            }, function (response) {

                var errorBody = $translate.instant('failed_to_fetch_events');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
            });

            return promise;
        },
        getEventsByProgram: function(entity, program, attributeCategory){
            var url = DHIS2URL + '/events.json?ouMode=ACCESSIBLE&' + 'trackedEntityInstance=' + entity + skipPaging;

            url = url + '&program=' + program;

            if( attributeCategory && !attributeCategory.default){
                url = url + '&attributeCc=' + attributeCategory.cc + '&attributeCos=' + attributeCategory.cp;
            }

            var promise = TeiAccessApiService.get(entity,program, url ).then(function(response){
                return response.data.events;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_fetch_events');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        getEventsByProgramStage: function(entity, program, programStage){
            var url = DHIS2URL + '/events.json?ouMode=ACCESSIBLE&' + 'trackedEntityInstance=' + entity + skipPaging;
            if(programStage){
                url += '&programStage='+programStage;
            }
            var promise = TeiAccessApiService.get(entity,program, url).then(function(response){
                return response.data.events;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_fetch_events');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        getByOrgUnitAndProgram: function(orgUnit, ouMode, program, startDate, endDate){
            var url;
            if(startDate && endDate){
                url = DHIS2URL + '/events.json?' + 'orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program + '&startDate=' + startDate + '&endDate=' + endDate + skipPaging;
            }
            else{
                url = DHIS2URL + '/events.json?' + 'orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program + skipPaging;
            }
            var promise = $http({method: 'GET', url: url, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return response.data.events;
            }, function(response){
                if( response && response.data && response.data.status === 'ERROR'){
                    var errorBody = $translate.instant('unable_to_fetch_data_from_server');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                }
            });
            return promise;
        },
        get: function(teiUid, programUid, eventUid){
            var promise = TeiAccessApiService.get(teiUid, programUid, DHIS2URL + '/events/' + eventUid + '.json').then(function(response){
                return response.data;
            }, function (response) {
                if (response && response.data && response.data.status === 'ERROR') {
                    var errorBody = $translate.instant('failed_to_fetch_events');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                }
            });
            return promise;
        },
        getEventWithoutRegistration: function(eventId) {
            var url = DHIS2URL + '/events/' + eventId;

            var promise = $http({method: 'GET', url: url, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return response.data;
            }, function(response){
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        create: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.post(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events.json', dhis2Event).then(function(response){
                return response.data;
            }, function (response) {
                if (response && response.data && (response.data.status === 'ERROR' || response.data.status === 'WARNING')) {
                    var errorBody = $translate.instant('event_creation_error');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                    return null;
                }
            });
            return promise;
        },
        delete: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.delete(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events/' + dhis2Event.event).then(function(response){
                return response.data;
            }, function (response) {
                if (response && response.data && response.data.status === 'ERROR') {
                    var errorBody = $translate.instant('delete_error_audit');
                    NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                }
            });
            return promise;
        },
        update: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.put(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events/' + dhis2Event.event, dhis2Event).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
            });
            return promise;
        },
        updateForSingleValue: function(singleValue){
            var promise = TeiAccessApiService.put(singleValue.trackedEntityInstance, singleValue.program, DHIS2URL + '/events/' + singleValue.event + '/' + singleValue.dataValues[0].dataElement, singleValue ).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        updateForNote: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.post(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events/' + dhis2Event.event + '/note', dhis2Event).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        },
        updateForEventDate: function(dhis2Event){
            var contextEvent = getContextEvent(dhis2Event);
            var promise = TeiAccessApiService.put(contextEvent.trackedEntityInstance, contextEvent.program, DHIS2URL + '/events/' + dhis2Event.event + '/eventDate', dhis2Event).then(function(response){
                return response.data;
            }, function (response) {
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        }
    };
})

/* factory for handling event reports */
.factory('EventReportService', function($http, DHIS2URL, $translate, NotificationService, $cookies) {
    var errorHeader = $translate.instant("error");
    return {

        getEventReport: function(orgUnit, ouMode, program, startDate, endDate, programStatus, eventStatus, pager){

            var url = DHIS2URL + '/events/eventRows.json?' + 'orgUnit=' + orgUnit + '&ouMode='+ ouMode + '&program=' + program;

            if( programStatus ){
                url = url + '&programStatus=' + programStatus;
            }

            if( eventStatus ){
                url = url + '&eventStatus=' + eventStatus;
            }

            if(startDate && endDate){
                url = url + '&startDate=' + startDate + '&endDate=' + endDate ;
            }

            if( pager ){
                var pgSize = pager ? pager.pageSize : 50;
                var pg = pager ? pager.page : 1;
                pgSize = pgSize > 1 ? pgSize  : 1;
                pg = pg > 1 ? pg : 1;
                url = url + '&pageSize=' + pgSize + '&page=' + pg + '&totalPages=true';
            }

            var promise = $http({method: 'GET', url: url, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                return response.data;
            }, function(response){
                var errorBody = $translate.instant('failed_to_update_event');
                NotificationService.showNotifcationDialog(errorHeader, errorBody, response);
                return null;
            });
            return promise;
        }
    };
})

.factory('OperatorFactory', function($translate){

    var defaultOperators = [$translate.instant('IS'), $translate.instant('RANGE') ];
    var boolOperators = [$translate.instant('yes'), $translate.instant('no')];
    var textOperators = [$translate.instant('EQ')];
    return{
        defaultOperators: defaultOperators,
        boolOperators: boolOperators,
        textOperators: textOperators
    };
})
/* factory to fetch and process metadata */
.factory('MetaDataFactory', function($q, $rootScope, TCStorageService) {
    return {
        get: function(store, uid){

            var def = $q.defer();

            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.get(store, uid).done(function(pv){
                    $rootScope.$apply(function(){
                        def.resolve(pv);
                    });
                });
            });
            return def.promise;
        },
        getByProgram: function(store, program){
            var def = $q.defer();
            var obj = [];

            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.getAll(store, program).done(function(pvs){
                    angular.forEach(pvs, function(pv){
                        if(pv.program.id === program){
                            obj.push(pv);
                        }
                    });

                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        getAll: function(store){
            var def = $q.defer();
            TCStorageService.currentStore.open().done(function(){
                TCStorageService.currentStore.getAll(store).done(function(pvs){
                    $rootScope.$apply(function(){
                        def.resolve(pvs);
                    });
                });
            });
            return def.promise;
        }
    };
})

/* Returns a function for getting rules for a specific program */
.factory('TrackerRulesFactory', function($q,MetaDataFactory,$filter,$rootScope){
    var staticReplacements =
        [{regExp:new RegExp("([^\w\d])(and)([^\w\d])","gi"), replacement:"$1&&$3"},
            {regExp:new RegExp("([^\w\d])(or)([^\w\d])","gi"), replacement:"$1||$3"},
            {regExp:new RegExp("V{execution_date}","g"), replacement:"V{event_date}"}];

    var performStaticReplacements = function(expression) {
        angular.forEach(staticReplacements, function(staticReplacement) {
            expression = expression.replace(staticReplacement.regExp, staticReplacement.replacement);
        });

        return expression;
    };

    return{
        getRules : function(programUid){
            var def = $q.defer();
            MetaDataFactory.getAll('constants').then(function(constants) {
                
                if($rootScope.customConstants) {
                    if(!constants) {
                        constants = [];
                    }
                    constants = constants.concat($rootScope.customConstants);
                }

                MetaDataFactory.getByProgram('programIndicators',programUid).then(function(pis){
                    var variables = [];
                    var programRules = [];
                    angular.forEach(pis, function(pi){
                        if(pi.displayInForm){
                            var newAction = {
                                id:pi.id,
                                content:pi.displayDescription ? pi.displayDescription : pi.displayName,
                                data:pi.expression,
                                programRuleActionType:'DISPLAYKEYVALUEPAIR',
                                location:'indicators'
                            };
                            var newRule = {
                                name:pi.displayName,
                                id: pi.id,
                                shortname:pi.shortname,
                                code:pi.code,
                                program:pi.program,
                                description:pi.description,
                                condition:pi.filter ? pi.filter : 'true',
                                programRuleActions: [newAction]
                            };

                            programRules.push(newRule);

                            var variablesInCondition = newRule.condition.match(/[A#]{\w+.?\w*}/g);
                            var variablesInData = newAction.data.match(/[A#]{\w+.?\w*}/g);
                            var valueCountPresent = newRule.condition.indexOf("V{value_count}") >= 0
                                || newAction.data.indexOf("V{value_count}") >= 0;
                            var positiveValueCountPresent = newRule.condition.indexOf("V{zero_pos_value_count}") >= 0
                                || newAction.data.indexOf("V{zero_pos_value_count}") >= 0;
                            var variableObjectsCurrentExpression = [];

                            var pushDirectAddressedVariable = function(variableWithCurls) {
                                var variableName = $filter('trimvariablequalifiers')(variableWithCurls);
                                var variableNameParts = variableName.split('.');

                                var newVariableObject;

                                if(variableNameParts.length === 2) {
                                    //this is a programstage and dataelement specification. translate to program variable:
                                    newVariableObject = {
                                        displayName:variableName,
                                        programRuleVariableSourceType:'DATAELEMENT_NEWEST_EVENT_PROGRAM_STAGE',
                                        dataElement:variableNameParts[1],
                                        programStage:variableNameParts[0],
                                        program:programUid,
                                        useCodeForOptionSet:true
                                    };
                                }
                                else if(variableNameParts.length === 1)
                                {
                                    //This is an attribute - let us translate to program variable:
                                    newVariableObject = {
                                        displayName:variableName,
                                        programRuleVariableSourceType:'TEI_ATTRIBUTE',
                                        trackedEntityAttribute:variableNameParts[0],
                                        program:programUid,
                                        useCodeForOptionSet:true
                                    };
                                }
                                variables.push(newVariableObject);

                                return newVariableObject;

                            };

                            angular.forEach(variablesInCondition, function(variableInCondition) {
                                var pushed = pushDirectAddressedVariable(variableInCondition);
                            });

                            angular.forEach(variablesInData, function(variableInData) {
                                var pushed = pushDirectAddressedVariable(variableInData);

                                //We only count the number of values in the data part of the rule
                                //(Called expression in program indicators)
                                variableObjectsCurrentExpression.push(pushed);
                            });

                            //Change expression or data part of the rule to match the program rules execution model

                            if(valueCountPresent) {
                                var valueCountText;
                                angular.forEach(variableObjectsCurrentExpression, function(variableCurrentRule) {
                                    if(valueCountText) {
                                        //This is not the first value in the value count part of the expression.
                                        valueCountText +=  ' + d2:count(\'' + variableCurrentRule.displayName + '\')';
                                    }
                                    else
                                    {
                                        //This is the first part value in the value count expression:
                                        valueCountText = '(d2:count(\'' + variableCurrentRule.displayName + '\')';
                                    }
                                });
                                //To finish the value count expression we need to close the paranthesis:
                                valueCountText += ')';

                                //Replace all occurrences of value counts in both the data and expression:
                                newRule.condition = newRule.condition.replace(new RegExp("V{value_count}", 'g'),valueCountText);
                                newAction.data = newAction.data.replace(new RegExp("V{value_count}", 'g'),valueCountText);
                            }
                            if(positiveValueCountPresent) {
                                var zeroPosValueCountText;
                                angular.forEach(variableObjectsCurrentExpression, function(variableCurrentRule) {
                                    if(zeroPosValueCountText) {
                                        //This is not the first value in the value count part of the expression.
                                        zeroPosValueCountText +=  '+ d2:countifzeropos(\'' + variableCurrentRule.displayName + '\')';
                                    }
                                    else
                                    {
                                        //This is the first part value in the value count expression:
                                        zeroPosValueCountText = '(d2:countifzeropos(\'' + variableCurrentRule.displayName + '\')';
                                    }
                                });
                                //To finish the value count expression we need to close the paranthesis:
                                zeroPosValueCountText += ')';

                                //Replace all occurrences of value counts in both the data and expression:
                                newRule.condition = newRule.condition.replace(new RegExp("V{zero_pos_value_count}", 'g'),zeroPosValueCountText);
                                newAction.data = newAction.data.replace(new RegExp("V{zero_pos_value_count}", 'g'),zeroPosValueCountText);
                            }

                            newAction.data = performStaticReplacements(newAction.data);
                            newRule.condition = performStaticReplacements(newRule.condition);
                        }
                    });

                    var programIndicators = {rules:programRules, variables:variables};

                    MetaDataFactory.getByProgram('programRuleVariables',programUid).then(function(programVariables){
                        MetaDataFactory.getByProgram('programRules',programUid).then(function(prs){
                            var programRules = [];
                            angular.forEach(prs, function(rule){
                                rule.actions = [];
                                rule.programStageId = rule.programStage && rule.programStage.id ? rule.programStage.id : null;
                                programRules.push(rule);
                            });
                            def.resolve({constants: constants, programIndicators: programIndicators, programVariables: programVariables, programRules: programRules});
                        });
                    });

                });
            });
            return def.promise;
        }
    };
})

.service('EntityQueryFactory', function(OperatorFactory, DateUtils){

    this.getAttributesQuery = function(attributes, enrollment){

        var query = {url: null, hasValue: false};
        
        angular.forEach(attributes, function(attribute){

            if(attribute.valueType === 'DATE' || attribute.valueType === 'NUMBER' || attribute.valueType === 'DATETIME'){
                var q = '';

                if(attribute.operator === OperatorFactory.defaultOperators[0]){
                    if(attribute.exactValue && attribute.exactValue !== ''){
                        query.hasValue = true;
                        if(attribute.valueType === 'DATE' || attribute.valueType === 'DATETIME'){
                            attribute.exactValue = DateUtils.formatFromUserToApi(attribute.exactValue);
                        }

                        if(attribute.valueType === 'DATETIME') {
                            q += 'LIKE:' + attribute.exactValue + ':';
                        } else {
                            q += 'EQ:' + attribute.exactValue + ':';
                        }
                    }
                }
                if(attribute.operator === OperatorFactory.defaultOperators[1]){
                    if(attribute.startValue && attribute.startValue !== ''){
                        query.hasValue = true;
                        if(attribute.valueType === 'DATE' || attribute.valueType === 'DATETIME'){
                            attribute.startValue = DateUtils.formatFromUserToApi(attribute.startValue);
                        }
                        q += 'GT:' + attribute.startValue + ':';
                    }
                    if(attribute.endValue && attribute.endValue !== ''){
                        query.hasValue = true;
                        if(attribute.valueType === 'DATE' || attribute.valueType === 'DATETIME'){
                            attribute.endValue = DateUtils.formatFromUserToApi(attribute.endValue);
                        }
                        q += 'LT:' + attribute.endValue + ':';
                    }
                }
                if(query.url){
                    if(q){
                        q = q.substr(0,q.length-1);
                        query.url = query.url + '&filter=' + attribute.id + ':' + q;
                    }
                }
                else{
                    if(q){
                        q = q.substr(0,q.length-1);
                        query.url = 'filter=' + attribute.id + ':' + q;
                    }
                }
            }
            else{
                if(attribute.value && attribute.value !== ''){
                    query.hasValue = true;

                    if(angular.isArray(attribute.value)){
                        var q = '';
                        angular.forEach(attribute.value, function(val){
                            q += val + ';';
                        });

                        q = q.substr(0,q.length-1);

                        if(query.url){
                            if(q){
                                query.url = query.url + '&filter=' + attribute.id + ':IN:' + q;
                            }
                        }
                        else{
                            if(q){
                                query.url = 'filter=' + attribute.id + ':IN:' + q;
                            }
                        }
                    }
                    else{
                        if(query.url){
                            query.url = query.url + '&filter=' + attribute.id + ':LIKE:' + attribute.value;
                        }
                        else{
                            query.url = 'filter=' + attribute.id + ':LIKE:' + attribute.value;
                        }
                    }
                }
            }
        });

        if(enrollment){
            var q = '';
            if(enrollment.programEnrollmentStartDate && enrollment.programEnrollmentStartDate !== ''){
                query.hasValue = true;
                q += '&programEnrollmentStartDate=' + DateUtils.formatFromUserToApi(enrollment.programEnrollmentStartDate);
            }
            if(enrollment.programEnrollmentEndDate && enrollment.programEnrollmentEndDate !== ''){
                query.hasValue = true;
                q += '&programEnrollmentEndDate=' + DateUtils.formatFromUserToApi(enrollment.programEnrollmentEndDate);
            }
            if(enrollment.programIncidentStartDate && enrollment.programIncidentStartDate !== ''){
                query.hasValue = true;
                q += '&programIncidentStartDate=' + DateUtils.formatFromUserToApi(enrollment.programIncidentStartDate);
            }
            if(enrollment.programIncidentEndDate && enrollment.programIncidentEndDate !== ''){
                query.hasValue = true;
                q += '&programIncidentEndDate=' + DateUtils.formatFromUserToApi(enrollment.programIncidentEndDate);
            }
            if(q){
                if(query.url){
                    query.url = query.url + q;
                }
                else{
                    query.url = q;
                }
            }
        }
        return query;

    };

    this.resetAttributesQuery = function(attributes, enrollment){

        angular.forEach(attributes, function(attribute){
            attribute.exactValue = '';
            attribute.startValue = '';
            attribute.endValue = '';
            attribute.value = '';
        });

        if(enrollment){
            enrollment.programStartDate = '';
            enrollment.programEndDate = '';
        }
        return attributes;
    };
})

.service('TEIGridService', function(OptionSetService, CommonUtils, CurrentSelection, DateUtils, $location, $translate, $filter){
    var setShowGridColumn = function(column, columnIndex, config, savedGridColumnsKeyMap){
        if(config.showAll){
            column.show = true;
        }
        else if(savedGridColumnsKeyMap && savedGridColumnsKeyMap[column.id]){
            column.show = savedGridColumnsKeyMap[column.id].show;
        }else if(config.defaultRange && config.defaultRange.start && config.defaultRange.end){
            if(columnIndex >= config.defaultRange.start && columnIndex <= config.defaultRange.end){
                column.show = true;
            }
        }else{
            column.show = false;
        }
    }
    return {
        format: function(selectedOrgUnitId, grid, map, optionSets, invalidTeis, isFollowUp){
            var ouId = ($location.search()).ou;
            if (!ouId) {
                ouId = selectedOrgUnitId;
            }

            invalidTeis = !invalidTeis ? [] : invalidTeis;
            if (!grid || !grid.rows) {
                return;
            }

            //grid.headers[0-6] = Instance, Created, Last updated, OU ID, Ou Name, Tracked entity, Inactive
            //grid.headers[7..] = Attribute, Attribute,....
            var attributes = [];
            for (var i = 6; i < grid.headers.length; i++) {
                attributes.push({
                    id: grid.headers[i].name,
                    displayName: grid.headers[i].column,
                    type: grid.headers[i].type,
                    hideInList: grid.headers[i].hideInList,
                });
            }

            var entityList = {own: [], other: []};

            var attributesById = CurrentSelection.getAttributesById();

            angular.forEach(grid.rows, function (row) {
                if (invalidTeis.indexOf(row[0]) === -1) {
                    var entity = {};

                    entity.id = row[0];
                    entity.created = DateUtils.formatFromApiToUser(row[1]);

                    entity.orgUnit = row[3];
                    entity.orgUnitName = row[4];
                    entity.type = row[5];
                    entity.inactive = row[6] !== "" ? row[6] : false;
                    entity.followUp = isFollowUp;

                    if(grid.headers[grid.headers.length-1].column == 'TransferStatus'){
                        //entity.followUp =  entity.followUp || row[row.length-1] == "ACTIVE";
                    }
                    
                    for (var i = 7; i < row.length; i++) {
                        if (row[i] && row[i] !== '') {
                            var val = row[i];
                            if (attributesById[grid.headers[i].name] &&
                                attributesById[grid.headers[i].name].optionSetValue &&
                                optionSets &&
                                attributesById[grid.headers[i].name].optionSet &&
                                optionSets[attributesById[grid.headers[i].name].optionSet.id]) {
                                val = OptionSetService.getName(optionSets[attributesById[grid.headers[i].name].optionSet.id].options, val);
                            }
                            if (attributesById[grid.headers[i].name] && attributesById[grid.headers[i].name].valueType ) {
                                switch ( attributesById[grid.headers[i].name].valueType ){
                                    case "ORGANISATION_UNIT":
                                        CommonUtils.checkAndSetOrgUnitName( val );
                                        break;
                                    case "DATE":
                                        val = DateUtils.formatFromApiToUser(val);
                                        break;
                                }
                            }

                            entity[grid.headers[i].name] = val;
                        }
                    }

                    if (map) {
                        entityList[entity.id] = entity;
                    }
                    else {
                        if (entity.orgUnit === ouId) {
                            entityList.own.push(entity);
                        }
                        else {
                            entityList.other.push(entity);
                        }
                    }
                }
            });

            var len = entityList.own.length + entityList.other.length;
            return {headers: attributes.filter(a => !a.hideInList), rows: entityList, pager: grid.metaData.pager, length: len};
        },
        generateGridColumns: function(attributes, ouMode, nonConfidential){

            if( ouMode === null ){
                ouMode = 'SELECTED';
            }
            var filterTypes = {}, filterText = {};
            var columns = [];

            var returnAttributes = [];
            if(nonConfidential) {
                //Filter out attributes that is confidential, so they will not be part of any grid:
                returnAttributes = angular.copy($filter('nonConfidential')(attributes));
            }
            else
            {
                returnAttributes = angular.copy(attributes);
            }

            //also add extra columns which are not part of attributes (orgunit for example)
            columns.push({id: 'orgUnitName', displayName: $translate.instant('registering_unit'), valueType: 'TEXT', displayInListNoProgram: false, attribute: false});
            columns.push({id: 'created', displayName: $translate.instant('registration_date'), valueType: 'DATE', displayInListNoProgram: false, attribute: false});
            columns.push({id: 'inactive', displayName: $translate.instant('inactive'), valueType: 'BOOLEAN', displayInListNoProgram: false, attribute: false});
            columns = columns.concat(returnAttributes ? returnAttributes : []);

            //generate grid column for the selected program/attributes
            angular.forEach(columns, function(column){
                column.attribute = angular.isUndefined(column.attribute) ? true : false;
                column.show = false;

                if( (column.id === 'orgUnitName' && ouMode !== 'SELECTED') ||
                    column.displayInListNoProgram ||
                    column.displayInList){
                    column.show = true;
                }
                column.showFilter = false;
                filterTypes[column.id] = column.valueType;
                if(column.valueType === 'DATE' || column.valueType === 'NUMBER' ){
                    filterText[column.id]= {};
                }
            });
            return {columns: columns, filterTypes: filterTypes, filterText: filterText};
        },
        makeGridColumns: function(attributes,config, savedGridColumnsKeyMap){
            var gridColumns = [
                {id: 'orgUnitName', displayName: $translate.instant('registering_unit'), show: true, valueType: 'TEXT'},
                {id: 'created', displayName: $translate.instant('registration_date'), show: true, valueType: 'DATE'},
                {id: 'inactive', displayName: $translate.instant('inactive'), show: false, valueType: 'BOOLEAN'}
            ];
            setShowGridColumn(gridColumns[0],0, config, savedGridColumnsKeyMap);
            setShowGridColumn(gridColumns[1],1, config, savedGridColumnsKeyMap);
            setShowGridColumn(gridColumns[2],2, config, savedGridColumnsKeyMap);

            var gridColumnIndex = 2;
            
            angular.forEach(attributes, function(attr){
                if(attr.displayInListNoProgram){
                    gridColumnIndex++;
                    var gridColumn = {id: attr.id, displayName: attr.displayName, formName: attr.formName, show: false, valueType: attr.valueType};
                    setShowGridColumn(gridColumn, gridColumnIndex, config, savedGridColumnsKeyMap);
                    gridColumns.push(gridColumn);
                }
            });

            return gridColumns;
        },
        generateGridColumnsForSearch: function(existedColumns, attributes, ouMode, nonConfidential){
            if( ouMode === null ){
                ouMode = 'SELECTED';
            }
            var filterTypes = {}, filterText = {};
            var columns = [];

            var returnAttributes = [];

            if ( attributes )
            {
                if( nonConfidential ) {
                    //Filter out attributes that is confidential, so they will not be part of any grid:
                    returnAttributes = angular.copy($filter('nonConfidential')(attributes));
                }
                else
                {
                    returnAttributes = angular.copy( attributes );
                }
            }

            if ( !existedColumns ) {
                //also add extra columns which are not part of attributes (orgunit for example)
                columns.push({id: 'orgUnitName', displayName: $translate.instant('registering_unit'), valueType: 'TEXT', displayInListNoProgram: false, attribute: false});
                columns.push({id: 'created', displayName: $translate.instant('registration_date'), valueType: 'DATE', displayInListNoProgram: false, attribute: false});
                columns.push({id: 'inactive', displayName: $translate.instant('inactive'), valueType: 'BOOLEAN', displayInListNoProgram: false, attribute: false});
                columns = columns.concat(returnAttributes ? returnAttributes : []);
                //generate grid column for the selected program/attributes
                angular.forEach(columns, function(column)
                {
                    column.attribute = angular.isUndefined(column.attribute) ? true : false;
                    column.show = false;

                    if( (column.id === 'orgUnitName' && ouMode !== 'SELECTED') || column.displayInListNoProgram || column.displayInList )
                    {
                        column.show = true
                    }
                    column.showFilter = false;
                    filterTypes[column.id] = column.valueType;
                    if(column.valueType === 'DATE' || column.valueType === 'NUMBER' )
                    {
                        filterText[column.id]= {};
                    }

                });
            }
            else
            {
                for ( var i = 0; i <  Object.keys( returnAttributes ).length; i ++ )
                {
                    var existed = false;
                    var col = returnAttributes[i];
                    for ( var j = 0; j < Object.keys( existedColumns ).length; j++ )
                    {
                        if ( col.id == existedColumns[j].id )
                        {
                            columns.push(existedColumns[j]);
                            existed = true;
                            break;
                        }
                    }

                    if ( !existed )
                    {
                        col.attribute = angular.isUndefined(col.attribute) ? true : false;
                        col.show = false;
                        col.showFilter = false;
                        filterTypes[col.id] = col.valueType;
                        if(col.valueType === 'DATE' || col.valueType === 'NUMBER' ){
                            filterText[col.id]= {};
                        }
                        columns.push(col);
                    }
                }
            }
            return {columns: columns, filterTypes: filterTypes, filterText: filterText};
        },
        getData: function(rows, columns){
            var data = [];
            angular.forEach(rows, function(row){
                var d = {};
                angular.forEach(columns, function(col){
                    if(col.show){
                        d[col.displayName] = row[col.id];
                    }
                });
                data.push(d);
            });
            return data;
        },
        getHeader: function(columns){
            var header = [];
            angular.forEach(columns, function(col){
                if(col.show){
                    header.push($translate.instant(col.displayName));
                }
            });
            return header;
        }
    };
})

.service('EventUtils', function(DateUtils, CommonUtils, PeriodService, CalendarService, CurrentSelection, $translate, $filter, $rootScope, orderByFilter){

    var getEventDueDate = function(eventsByStage, programStage, enrollment){

        var referenceDate = enrollment.incidentDate ? enrollment.incidentDate : enrollment.enrollmentDate,
            offset = programStage.minDaysFromStart,
            calendarSetting = CalendarService.getSetting(),
            dueDate;

        if(programStage.generatedByEnrollmentDate){
            referenceDate = enrollment.enrollmentDate;
        }

        if(programStage.repeatable){
            var evs = [];
            angular.forEach(eventsByStage, function(ev){
                if(ev.eventDate){
                    evs.push(ev);
                }
            });

            if(evs.length > 0){
                evs = orderByFilter(evs, '-eventDate');
                if(programStage.periodType){

                }
                else{
                    referenceDate = evs[0].eventDate;
                    offset = programStage.standardInterval;
                }
            }
        }
        dueDate = moment(referenceDate, calendarSetting.momentFormat).add('d', offset)._d;
        dueDate = $filter('date')(dueDate, calendarSetting.keyDateFormat);
        return dueDate;
    };

    var getEventDuePeriod = function(eventsByStage, programStage, enrollment){

        var evs = [];
        angular.forEach(eventsByStage, function(ev){
            if(ev.eventDate){
                evs.push(ev);
            }
        });

        if(evs.length > 0){
            evs = orderByFilter(evs, '-eventDate');
        }

        return PeriodService.getPeriods(evs,programStage, enrollment);
    };

    var reconstructEvent = function(dhis2Event, programStage, optionSets){
        var e = {dataValues: [],
            event: dhis2Event.event,
            program: dhis2Event.program,
            programStage: dhis2Event.programStage,
            orgUnit: dhis2Event.orgUnit,
            trackedEntityInstance: dhis2Event.trackedEntityInstance,
            status: dhis2Event.status,
            dueDate: DateUtils.formatFromUserToApi(dhis2Event.dueDate),
            geometry: dhis2Event.geometry,
            assignedUser: dhis2Event.assignedUser
        };

        angular.forEach(programStage.programStageDataElements, function(prStDe){
            if(dhis2Event[prStDe.dataElement.id] || dhis2Event[prStDe.dataElement.id] === 0){
                var value = CommonUtils.formatDataValue(dhis2Event.event, dhis2Event[prStDe.dataElement.id], prStDe.dataElement, optionSets, 'API');
                var val = {value: value, dataElement: prStDe.dataElement.id};
                if(dhis2Event.providedElsewhere[prStDe.dataElement.id]){
                    val.providedElsewhere = dhis2Event.providedElsewhere[prStDe.dataElement.id];
                }
                e.dataValues.push(val);
            }
        });

        if(dhis2Event.eventDate){
            e.eventDate = DateUtils.formatFromUserToApi(dhis2Event.eventDate);
        }

        return e;
    };

    return {
        createDummyEvent: function(eventsPerStage, tei, program, programStage, orgUnit, enrollment){
            var today = DateUtils.getToday();
            var dummyEvent = {trackedEntityInstance: tei.trackedEntityInstance,
                programStage: programStage.id,
                program: program.id,
                orgUnit: orgUnit.id,
                orgUnitName: orgUnit.displayName ? orgUnit.displayName : orgUnit.n ? orgUnit.n : null,
                name: programStage.displayName,
                executionDateLabel: programStage.executionDateLabel ? programStage.executionDateLabel : $translate.instant('report_date'),
                enrollmentStatus: 'ACTIVE',
                enrollment: enrollment.enrollment,
                status: 'SCHEDULED'};

            if(programStage.periodType){
                var prds = getEventDuePeriod(eventsPerStage, programStage, enrollment);
                var periods = prds && prds.availablePeriods && prds.availablePeriods.length ? prds.availablePeriods : [];
                if( periods.length > 0 ){
                    dummyEvent.dueDate = periods[0].endDate;
                    dummyEvent.periodName = periods[0].displayName;
                    dummyEvent.eventDate = dummyEvent.dueDate;
                    dummyEvent.periods = periods;
                    dummyEvent.periodOffset = prds.periodOffset;
                    dummyEvent.hasFuturePeriod = prds.hasFuturePeriod;
                }
            }
            else{
                dummyEvent.dueDate = getEventDueDate(eventsPerStage, programStage, enrollment);
            }

            dummyEvent.sortingDate = dummyEvent.dueDate;


            if(programStage.captureCoordinates){
                dummyEvent.coordinate = {};
            }

            dummyEvent.statusColor = 'alert-warning';//'stage-on-time';
            if(moment(today).isAfter(dummyEvent.dueDate)){
                dummyEvent.statusColor = 'alert-danger';//'stage-overdue';
            }
            return dummyEvent;
        },
        getEventStatusColor: function(dhis2Event){
            var eventDate = DateUtils.getToday();
            var calendarSetting = CalendarService.getSetting();

            if(dhis2Event.eventDate){
                eventDate = dhis2Event.eventDate;
            }

            if(dhis2Event.status === 'COMPLETED'){
                return 'custom-tracker-complete';//'stage-completed';
            }
            else if(dhis2Event.status === 'SKIPPED'){
                return 'alert-default'; //'stage-skipped';
            }
            else{
                if(dhis2Event.eventDate){
                    return 'alert-warning'; //'stage-executed';
                }
                else{
                    if(moment(eventDate, calendarSetting.momentFormat).isAfter(moment(dhis2Event.dueDate, calendarSetting.momentFormat))){
                        return 'alert-danger';//'stage-overdue';
                    }
                    return 'alert-success';//'stage-on-time';
                }
            }
        },
        autoGenerateEvents: function(teiId, program, orgUnit, enrollment, availableEvent){
            var dhis2Events = {events: []};
            if(teiId && program && orgUnit && enrollment){
                angular.forEach(program.programStages, function(stage){
                    if(availableEvent && availableEvent.programStage && availableEvent.programStage === stage.id){
                        var ev = availableEvent;
                        ev.dueDate = ev.dueDate ? ev.dueDate : ev.eventDate;
                        ev.trackedEntityInstance = teiId;
                        ev.enrollment = enrollment.enrollment;
                        delete ev.event;
                        ev = reconstructEvent(ev, stage, CurrentSelection.getOptionSets());
                        dhis2Events.events.push(ev);
                    }

                    if(stage.autoGenerateEvent && (!availableEvent || availableEvent && availableEvent.programStage && availableEvent.programStage !== stage.id)){
                        var newEvent = {
                            trackedEntityInstance: teiId,
                            program: program.id,
                            programStage: stage.id,
                            orgUnit: orgUnit.id,
                            enrollment: enrollment.enrollment
                        };
                        if(stage.periodType){
                            var periods = getEventDuePeriod(null, stage, enrollment);
                            newEvent.dueDate = DateUtils.formatFromUserToApi(periods[0].endDate);
                            newEvent.eventDate = newEvent.dueDate;
                        }
                        else{
                            newEvent.dueDate = DateUtils.formatFromUserToApi(getEventDueDate(null,stage, enrollment));
                        }

                        if(stage.openAfterEnrollment){
                            if(stage.reportDateToUse === 'incidentDate'){
                                newEvent.eventDate = DateUtils.formatFromUserToApi(enrollment.incidentDate);
                            }
                            else{
                                newEvent.eventDate = DateUtils.formatFromUserToApi(enrollment.enrollmentDate);
                            }
                        }

                        newEvent.status = newEvent.eventDate ? 'ACTIVE' : 'SCHEDULE';

                        dhis2Events.events.push(newEvent);
                    }
                });
            }

            return dhis2Events;
        },
        reconstruct: function(dhis2Event, programStage, optionSets){
            return reconstructEvent(dhis2Event, programStage, optionSets);
        },
        processEvent: function(event, stage, optionSets, prStDes){
            event.providedElsewhere = {};
            angular.forEach(event.dataValues, function(dataValue){

                var prStDe = prStDes[dataValue.dataElement];

                if( prStDe ){
                    var val = dataValue.value;
                    if(prStDe.dataElement){
                        val = CommonUtils.formatDataValue(event.event, val, prStDe.dataElement, optionSets, 'USER');
                    }
                    event[dataValue.dataElement] = val;
                    if(dataValue.providedElsewhere){
                        event.providedElsewhere[dataValue.dataElement] = dataValue.providedElsewhere;
                    }

                    switch( prStDe.dataElement.valueType ){
                        case "ORGANISATION_UNIT":
                            CommonUtils.checkAndSetOrgUnitName( val );
                            break;
                    }
                }

            });

            if(stage.captureCoordinates){
                event.coordinate = {latitude: event.coordinate.latitude ? event.coordinate.latitude : '',
                    longitude: event.coordinate.longitude ? event.coordinate.longitude : ''};
            }

            event.allowProvidedElsewhereExists = false;
            for(var i=0; i<stage.programStageDataElements.length; i++){
                if(stage.programStageDataElements[i].allowProvidedElsewhere){
                    event.allowProvidedElsewhereExists = true;
                    break;
                }
            }
            return event;
        },
        getGridColumns: function(stage, prStDes){
            var partial = [], allColumns = [];
            partial.push({id: 'sortingDate', valueType: 'DATE', name: stage.executionDateLabel ? stage.executionDateLabel : $translate.instant('report_date')});
            partial.push({id: 'orgUnitName', valueType: 'TEXT', name: $translate.instant('org_unit')});
            allColumns.push({id: 'sortingDate', valueType: 'DATE', name: stage.executionDateLabel ? stage.executionDateLabel : $translate.instant('report_date')});
            allColumns.push({id: 'orgUnitName', valueType: 'TEXT', name: $translate.instant('org_unit')});
            if(stage.enableUserAssignment) {
                partial.push({id: 'assignedUserUsername', valueType: 'TEXT', name: $translate.instant('assigned_user')});
                allColumns.push({id: 'assignedUserUsername', valueType: 'TEXT', name: $translate.instant('assigned_user')});
            }

            var displayInReports = $filter('filter')(stage.programStageDataElements, {displayInReports: true});
            if( displayInReports.length > 0 ){
                angular.forEach(displayInReports, function(c){
                    if ( prStDes[c.dataElement.id] && prStDes[c.dataElement.id].dataElement) {
                        partial.push({id: c.dataElement.id, valueType: prStDes[c.dataElement.id].dataElement.valueType, name: prStDes[c.dataElement.id].dataElement.displayFormName});
                    }
                });
            }
            for(var i=0; i<stage.programStageDataElements.length; i++){
                if( i < $rootScope.maxGridColumnSize && displayInReports.length === 0){
                    partial.push({id: stage.programStageDataElements[i].dataElement.id, valueType: stage.programStageDataElements[i].dataElement.valueType, name: prStDes[stage.programStageDataElements[i].dataElement.id].dataElement.displayFormName});
                }
                allColumns.push({id: stage.programStageDataElements[i].dataElement.id, valueType: stage.programStageDataElements[i].dataElement.valueType, name: prStDes[stage.programStageDataElements[i].dataElement.id].dataElement.displayFormName});
            }
            return {partial: partial, all: allColumns};
        },
        getEditingStatus: function(dhis2Event, stage, orgUnit, tei, enrollment,program, searchOrgUnits){
            return (stage.blockEntryForm && dhis2Event.status === 'COMPLETED') || tei.inactive || enrollment.status !== 'ACTIVE';
        },
        isExpired: function(program, event){
            var expired = !DateUtils.verifyExpiryDate(event.eventDate, program.expiryPeriodType, program.expiryDays, false);
            if(expired) return true;

            if(event.status === 'COMPLETED' && program.completeEventsExpiryDays && program.completeEventsExpiryDays > 0){
                var expiryDate = moment(event.completedDate).add(program.completeEventsExpiryDays, 'days');
                var now = moment();
                if(expiryDate < now) return true;
            }
            return false;
        }
    };
})

.service('EventCreationService', function($modal){

    this.showModal = function(eventsByStage, stage, availableStages, writableStages, programStages,selectedEntity,selectedProgram,selectedOrgUnit,selectedEnrollment, autoCreate, eventCreationAction,allEventsSorted, selectedCategories, referralMode){
        var modalInstance = $modal.open({
            templateUrl: 'components/dataentry/new-event.html',
            controller: 'EventCreationController',
            windowClass: 'modal-new-event-window',
            resolve: {
                eventsByStage: function () {
                    return eventsByStage;
                },
                stage: function () {
                    return stage;
                },
                stages: function(){
                    return availableStages;
                },
                writableStages: function(){
                    return writableStages;
                },
                allStages: function(){
                    return programStages;
                },
                tei: function(){
                    return selectedEntity;
                },
                program: function(){
                    return selectedProgram;
                },
                orgUnit: function(){
                    return selectedOrgUnit;
                },
                enrollment: function(){
                    return selectedEnrollment;
                },
                autoCreate: function () {
                    return autoCreate;
                },
                eventCreationAction: function(){
                    return eventCreationAction;
                },
                events: function(){
                    return allEventsSorted;
                },
                selectedCategories: function () {
                    return selectedCategories;
                },
                referralMode: function() {
                    return referralMode;
                }
            }
        }).result;
        return modalInstance;
    };
    this.eventCreationActions = { add: 'ADD',  schedule: 'SCHEDULE', referral: 'REFERRAL'};
})

.service('MessagingService', function($http, $translate,  NotificationService, DHIS2URL, $cookies){
    return {
        sendMessage: function(message){
            var promise = $http({method: 'POST', url: DHIS2URL + '/messages', data: message, headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                var headerText, bodyText;
                if (response && response.data && response.data.summaries) {
                    var summary = response.data.summaries[0];
                    if (summary.status) {
                        if(summary.status === "COMPLETED") {
                            headerText = "SMS sendt"
                        } else {
                            headerText = summary.status;
                        }
                        if (summary.responseMessage) {
                            if(summary.responseMessage === "SENT") {
                                bodyText = "Meldingen ble sendt og lagret som notat. (Last siden på nytt for å se notatet)"
                            } else {
                                bodyText = summary.responseMessage;
                            }
                        } else if (summary.errorMessage) {
                            bodyText = summary.errorMessage;
                        }else {
                            bodyText = $translate.instant("failed_to_send_message");
                        }
                        NotificationService.showNotifcationDialog(headerText, bodyText);
                    }
                }
                return response.data;
            }, function(response){
                var headerText = $translate.instant('error');
                var bodyText = $translate.instant('failed_to_send_message');
                if (response && response.summaries && response.summaries[0].errorMessage) {
                    bodyText = response.summaries[0].errorMessage;
                }
                NotificationService.showNotifcationDialog(headerText, bodyText);
                return null;
            });
            return promise;
        }
    };
})
.service('ProgramWorkingListService', function($http,$q,$filter, orderByFilter,orderByKeyFilter, TEIService, $cookies){
    var workingListsByProgram = null;
    var cachedMultipleEventFiltersData = {};
    var getDefaultWorkingLists = function(program){
        //Temporary until working list is implemented
        var defaultWorkingLists = [
            {
                name: "active_enrollment",
                description: "active_enrollment",
                program: {id: program.id},
                enrollmentStatus: "ACTIVE",
                style: {icon: "fa fa-circle-o"},
                sortOrder: 1
            },
            {
                name: "all_enrollments",
                description: "all_enrollment",
                program: {id: program.id},
                style: {icon: "fa fa-list"},
                sortOrder: 0
            },
            {
                name: "completed_enrollment",
                description: "completed_enrollment",
                program: {id: program.id},
                style: {icon: "fa fa-check"},
                enrollmentStatus: "COMPLETED",
                sortOrder: 2
            },
            {
                name: "cancelled_enrollment",
                description: "cancelled_enrollment",
                program: {id: program.id},
                style: {icon: "fa fa-times" },
                enrollmentStatus: "CANCELLED",
                sortOrder: 3
            }
        ];
        return defaultWorkingLists;
    }
    var getPeriodDate = function(days){
        return moment().add(days,'days').format('YYYY-MM-DD');
    }
    var getEventUrl = function(eventFilter){
        var eventUrl = "";
        if(eventFilter)
        {
            if(eventFilter.eventStatus) eventUrl = "eventStatus="+eventFilter.eventStatus;
            if(eventFilter.eventCreatedPeriod){
                if(eventUrl) eventUrl+= "&";
                eventUrl+="eventStartDate="+getPeriodDate(eventFilter.eventCreatedPeriod.periodFrom);
                eventUrl+="&eventEndDate="+getPeriodDate(eventFilter.eventCreatedPeriod.periodTo);
            }
            if(eventFilter.programStage){
                if(eventUrl) eventUrl+="&";
                eventUrl+="programStage="+eventFilter.programStage;
            }
            if(eventFilter.assignedUserMode){
                if(eventUrl) eventUrl+="&";
                eventUrl += "assignedUserMode="+eventFilter.assignedUserMode;
            }
            if(!eventFilter.assignedUserMode || eventFilter.assignedUserMode == "PROVIDED" 
            && eventFilter.assignedUsers && eventFilter.assignedUsers.length > 0){
                if(eventUrl) eventUrl+="&";
                eventUrl += "assignedUser=";
                for(var i = 0; i < eventFilter.assignedUsers.length; i++){
                    if(i > 0) eventUrl += ";";
                    eventUrl += eventFilter.assignedUsers[i];
                }
            }
        }
        return eventUrl;
    }
    var getCachedMultipleEventFiltersData = function(workingList, pager, sortColumn){
        var cachedData = cachedMultipleEventFiltersData[workingList.name];
        if(!pager) {
            pager = { page: 1, pageSize: 50 }
        };
        // This has to be set explicitly, as it is randomly wrong otherwise.
        pager.pageCount = Math.ceil(cachedData.rows.length/50)

        var pageEnd = (pager.pageSize*pager.page);
        var pageStart = pageEnd - pager.pageSize;

        var pageRows = cachedData.rows.slice(pageStart, pageEnd);
        var data = {
            rows: pageRows, 
            height: pageRows.length,
            width: cachedData.width,
            headers: cachedData.headers,
            metaData: {pager: pager}
        }
        return data;
    }
    var getWorkingListDataWithMultipleEventFilters = function(searchParams, workingList, pager, sortColumn){
        var def = $q.defer();

        var promises = [];
        angular.forEach(workingList.eventFilters, function(eventFilter){
            var eventUrl = getEventUrl(eventFilter);
            var tempPager = {
                pageSize:1000,
                page: 1
            }
            promises.push(TEIService.search(searchParams.orgUnitId, "SELECTED", searchParams.sortUrl, searchParams.programUrl, eventUrl,tempPager, true));
        });
        $q.all(promises).then(function(response){
            var data = { height: 0, width: 0, rows: []};
            var existingTeis = {};
            var allRows = [];
            angular.forEach(response, function(responseData){
                data.headers = data.headers && data.headers.length > responseData.headers.length ? data.headers : responseData.headers;
                data.width  = data.width > responseData.width ? data.width : responseData.width;
                allRows = allRows.concat(responseData.rows);
            });
            //Getting distinct list
            var existing = {};
            data.rows = allRows.filter(function(d){
                if(existing[d[0]])return false;
                existing[d[0]] = true;
                return true;
            });
            // Due to implementation, we cannot trust a number that is higher than 1000.
            var totalElementsIfLessThanThousand = data.rows && data.rows.length  < 1000 ? data.rows.length : -1;
            var sortColumnIndex = data.headers.findIndex(function(h){ return h.name === sortColumn.id});
            if(sortColumnIndex) data.rows = orderByKeyFilter(data.rows, sortColumnIndex, sortColumn.direction);
            //order list
            cachedMultipleEventFiltersData[workingList.name] = data;
            workingList.cachedSorting = searchParams.sortUrl;
            workingList.cachedOrgUnit = searchParams.orgUnitId;
            var data = getCachedMultipleEventFiltersData(workingList, pager, sortColumn);
            data.metaData.pager.total = totalElementsIfLessThanThousand;
            data.metaData.pager.pageCount = totalElementsIfLessThanThousand > 0 ? Math.ceil(totalElementsIfLessThanThousand/pager.pageSize) : 0
            def.resolve(data);
        });
        return def.promise;
    }

    this.getWorkingListsForProgram = function(program){
        if(!program){
            return $q.when([]);
        }

        var fetchPromise = workingListsByProgram ? $q.when() :
            $http({method: 'GET', url: DHIS2URL+"/trackedEntityInstanceFilters?fields=*&paging=false", headers: {'ingress-csrf': $cookies['ingress-csrf']}}).then(function(response){
                workingListsByProgram = {};
                if(response && response.data && response.data.trackedEntityInstanceFilters && response.data.trackedEntityInstanceFilters.length > 0){
                    angular.forEach(response.data.trackedEntityInstanceFilters, function(workingList){
                        if(!workingListsByProgram[workingList.program.id]) workingListsByProgram[workingList.program.id] = [];
                        workingListsByProgram[workingList.program.id].push(workingList);
                    });

                    for(var key in workingListsByProgram){
                        if(angular.isArray(workingListsByProgram[key])){
                            workingListsByProgram[key] = orderByKeyFilter(workingListsByProgram[key], 'sortOrder', 'asc');
                        }
                    }
                }  
            });
        
        return fetchPromise
            .then(() => {
                var workingLists = workingListsByProgram[program.id];
                if(!workingLists){
                    workingLists = orderByKeyFilter(getDefaultWorkingLists(program), 'sortOrder', 'asc');
                    workingListsByProgram[program.id] = workingLists;
                }
                return workingLists;
            });
    }

    this.getWorkingListData = function(orgUnit, workingList, pager, sortColumn){
        var searchParams = {
            orgUnitId: orgUnit.id,
            programUrl: "program="+workingList.program.id,
            eventUrl: null
        }
        if(workingList.enrollmentStatus){
            searchParams.programUrl += "&programStatus="+workingList.enrollmentStatus;
        }
        if(workingList.followup){
            searchParams.programUrl += "&followUp=true"
        }
        if(sortColumn){
            searchParams.sortUrl = "&order="+sortColumn.id+':'+sortColumn.direction + ',created:desc';
        }
        if(workingList.id === 'vo6JLWsbyMj') { //ikke sendte klinikermeldinger
            searchParams.programUrl += '&filter=C225m3EOPRo:IN:false';
        }
        if(workingList.id === 'QtdRocAYCCU' || workingList.id === 'VZOuDZ7p7mz') { //selvregistrering
            searchParams.programUrl += '&filter=FKviB19WReU:IN:true';
        }
        if(workingList.id === 'vd7fXsMSst5') { //tuberkulose indeksoppfølging
            searchParams.programUrl += '&filter=CYOl98TYOR5:IN:true';
        }
        if(workingList.enrollmentCreatedPeriod){
            var enrollmentStartDate = moment().add(workingList.enrollmentCreatedPeriod.periodFrom, 'days').format("YYYY-MM-DD");
            var enrollmentEndDate = moment().add(workingList.enrollmentCreatedPeriod.periodTo, 'days').format("YYYY-MM-DD");
            searchParams.programUrl += "&programStartDate="+enrollmentStartDate+"&programEndDate="+enrollmentEndDate;
        }
        if(workingList.eventFilters){
            if(workingList.eventFilters.length > 1){
                return getWorkingListDataWithMultipleEventFilters(searchParams, workingList, pager, sortColumn);
            }
            searchParams.eventUrl = getEventUrl(workingList.eventFilters[0]);
        }
        return TEIService.search(searchParams.orgUnitId, "SELECTED", searchParams.sortUrl, searchParams.programUrl, searchParams.eventUrl, pager, true);
    }
    this.setTrackedEntityList = function(trackedEntityList){
        this.trackedEntityList = trackedEntityList;
    }
})
.service("SearchGroupService", function(TEIService, $q, OperatorFactory, AttributesFactory, DateUtils){
    var programSearchConfigsById = {};
    var trackedEntityTypeSearchConfigsById = {};
    var defaultOperators = OperatorFactory.defaultOperators;
    var textOperators = OperatorFactory.textOperators;
    var searchScopes = { PROGRAM: "PROGRAM", TET: "TET"};

    this.getSearchScopes = function(){ return searchScopes;}
    var makeSearchConfig = function(dimensionAttributes, minAttributesRequiredToSearch,orgUnitUniqueAsSearchGroup){
        var searchConfig = { searchGroups: [], searchGroupsByAttributeId: {}};
        if(dimensionAttributes){
            var defaultSearchGroup = { id: dhis2.util.uid(), attributes: [], ouMode: {name: 'ACCESSIBLE'}, orgunitUnique: false};
            var attributes = AttributesFactory.generateAttributeFilters(angular.copy(dimensionAttributes));
            angular.forEach(attributes, function(attr){
                if(attr.searchable || (attr.unique && !attr.orgunitScope)){
                    searchConfig.searchGroupsByAttributeId[attr.id] = {};
                    if(attr.unique){
                        var uniqueAttr = attr.orgunitScope ? angular.copy(attr) : attr;
                        uniqueAttr.operator = ["DATETIME", "NUMBER", "DATE"].includes(uniqueAttr.valueType) ? defaultOperators[0] : textOperators[0];
                        var uniqueSearchGroup = {
                            id: dhis2.util.uid(),
                            uniqueGroup: true,
                            orgunitUnique: uniqueAttr.orgunitScope,
                            attributes: [uniqueAttr],
                            ouMode: {name: 'ACCESSIBLE'},
                            minAttributesRequiredToSearch: 1
                        }
                        if(uniqueAttr.orgunitScope) uniqueSearchGroup.ouMode = {name: 'SELECTED'};
                        searchConfig.searchGroups.push(uniqueSearchGroup);
                        searchConfig.searchGroupsByAttributeId[uniqueAttr.id].unique = uniqueSearchGroup;
                    }
                    if(!attr.unique || attr.orgunitScope){
                        if(attr.optionSetValue && attr.valueType === "TEXT") attr.operator = textOperators[0];
                        defaultSearchGroup.attributes.push(attr);
                        searchConfig.searchGroupsByAttributeId[attr.id].default = defaultSearchGroup;
                    }

                }
            });
            if(defaultSearchGroup.attributes.length !== 0){
                defaultSearchGroup.minAttributesRequiredToSearch = minAttributesRequiredToSearch;
                searchConfig.searchGroups.push(defaultSearchGroup);
            }
        }
        return searchConfig;
    }

    var getSearchParams = function(searchGroup, program, trackedEntityType, orgUnit, pager, searchScope, onGetFieldArgs){
        var uniqueSearch = false;
        var numberOfSetAttributes = 0;
        var filteredAttributes = {};
        var query = {url: null, hasValue: false};
        if(searchGroup){
            angular.forEach(searchGroup.attributes, function(attr){
                if(searchGroup.uniqueGroup) uniqueSearch = true;
                if(attr.valueType === 'DATE' || attr.valueType === 'AGE' || attr.valueType === 'NUMBER' || attr.valueType === 'DATETIME'){
                    var q = '';
    
                    if(attr.operator === OperatorFactory.defaultOperators[0]){
                        var exactValue = searchGroup[attr.id] ? searchGroup[attr.id].exactValue : null;
                        if(exactValue == null) exactValue = searchGroup[attr.id];


                        if(exactValue && exactValue !== ''){
                            query.hasValue = true;
                            if(attr.valueType === 'DATE' || attr.valueType === 'AGE' || attr.valueType === 'DATETIME'){
                                exactValue = DateUtils.formatFromUserToApi(exactValue);
                            }
                            if(attr.valueType === 'DATETIME') {
                                q += 'LIKE:' + exactValue + ':';
                            } else {
                                q += 'EQ:' + exactValue + ':';
                            }
                        }
                    }
                    if(attr.operator === OperatorFactory.defaultOperators[1]){
                        var startValue =  searchGroup[attr.id] ? searchGroup[attr.id].startValue : null;
                        var endValue = searchGroup[attr.id] ? searchGroup[attr.id].endValue : null;
                        if(startValue && startValue !== ''){
                            query.hasValue = true;
                            if(attr.valueType === 'DATE' || attr.valueType === 'AGE' || attr.valueType === 'DATETIME'){
                                startValue = DateUtils.formatFromUserToApi(startValue);
                            }
                            q += 'GT:' + startValue + ':';
                        }
                        if(endValue && endValue !== ''){
                            query.hasValue = true;
                            if(attr.valueType === 'DATE' || attr.valueType === 'AGE' || attr.valueType === 'DATETIME'){
                                endValue = DateUtils.formatFromUserToApi(endValue);
                            }
                            q += 'LT:' + endValue + ':';
                        }
                    }
                    if(query.url){
                        if(q){
                            numberOfSetAttributes++;
                            filteredAttributes[attr.id] = true;
                            q = q.substr(0,q.length-1);
                            query.url = query.url + '&attribute=' + attr.id + ':' + q;
                        }
                    }
                    else{
                        if(q){
                            numberOfSetAttributes++;
                            filteredAttributes[attr.id] = true;
                            q = q.substr(0,q.length-1);
                            query.url = 'attribute=' + attr.id + ':' + q;
                        }
                    }
                }
                else{
                    var value = searchGroup[attr.id] ? searchGroup[attr.id].value : null;
                    if(value == null) value = searchGroup[attr.id];
                    if(value && value !== ''){
                        query.hasValue = true;
    
                        if(angular.isArray(value)){
                            var q = '';
                            angular.forEach(value, function(val){
                                q += val + ';';
                            });
    
                            q = q.substr(0,q.length-1);
    
                            if(query.url){
                                if(q){
                                    numberOfSetAttributes++;
                                    filteredAttributes[attr.id] = true;
                                    query.url = query.url + '&attribute=' + attr.id + ':IN:' + q;
                                }
                            }
                            else{
                                if(q){
                                    numberOfSetAttributes++;
                                    filteredAttributes[attr.id] = true;
                                    query.url = 'attribute=' + attr.id + ':IN:' + q;
                                }
                            }
                        }
                        else{
                            if(query.url){
                                numberOfSetAttributes++;
                                filteredAttributes[attr.id] = true;
                                if(attr.operator === textOperators[0]){
                                    query.url = query.url + '&attribute=' + attr.id + ':EQ:' + value;
                                }else{
                                    query.url = query.url + '&attribute=' + attr.id + ':LIKE:' + value;
                                }
                                
                            }
                            else{
                                numberOfSetAttributes++;
                                filteredAttributes[attr.id] = true;
                                if(attr.operator === textOperators[0]){
                                    query.url = 'attribute=' + attr.id + ':EQ:' + value;
                                }else{
                                    query.url = 'attribute=' + attr.id + ':LIKE:' + value;
                                }
                                
                            }
                        }
                    }
                }
            });
        }
        if(query.hasValue &&(uniqueSearch || numberOfSetAttributes >= searchGroup.minAttributesRequiredToSearch)){
            if (onGetFieldArgs) {
                var fieldsArgs = onGetFieldArgs(filteredAttributes);
                query.url += fieldsArgs;
            }
            var programOrTETUrl = searchScope === searchScopes.PROGRAM ? "program="+program.id :"trackedEntityType="+trackedEntityType.id;

            var searchOrgUnit = searchGroup.orgUnit ? searchGroup.orgUnit : orgUnit;
            return { orgUnit: searchOrgUnit, ouMode: searchGroup.ouMode.name, programOrTETUrl: programOrTETUrl, queryUrl: query.url, pager: pager, paging: !uniqueSearch, uniqueSearch: uniqueSearch };
        }
    }
    
    this.getSearchConfigForProgram = function(program, orgUnitUniqueAsSearchGroup) {
        var def = $q.defer();
        if(!programSearchConfigsById[program.id]){
            return AttributesFactory.getByProgram(program).then(function(attributes)
            {
                var searchConfig = makeSearchConfig(attributes, program.minAttributesRequiredToSearch,orgUnitUniqueAsSearchGroup);
                programSearchConfigsById[program.id] = searchConfig;
                def.resolve(angular.copy(searchConfig));
                return def.promise;
            });
        }
        def.resolve(angular.copy(programSearchConfigsById[program.id]));
        return def.promise;
    }
    this.getSearchConfigForTrackedEntityType = function(trackedEntityType,orgUnitUniqueAsSearchGroup){
        var def = $q.defer();
        if(!trackedEntityTypeSearchConfigsById[trackedEntityType.id]){
            return AttributesFactory.getByTrackedEntityType(trackedEntityType).then(function(attributes)
            {
                var searchConfig = makeSearchConfig(attributes, trackedEntityType.minAttributesRequiredToSearch,orgUnitUniqueAsSearchGroup);
                trackedEntityTypeSearchConfigsById[trackedEntityType.id] = searchConfig;
                def.resolve(angular.copy(searchConfig));
                return def.promise;
            });
        }
        def.resolve(angular.copy(trackedEntityTypeSearchConfigsById[trackedEntityType.id]));
        return def.promise;
    }

    this.programScopeSearchCount = function(searchGroup,tetSearchGroup, program, trackedEntityType, orgUnit){
        var params = getSearchParams(searchGroup, program, trackedEntityType, orgUnit, null, searchScopes.PROGRAM);
        if(params){
            return TEIService.searchCount(params.orgUnit.id, params.ouMode,null, params.programOrTETUrl, params.queryUrl, null, false).then(function(response){
                if(response || response === 0){
                    return response;
                }else{
                    return tetScopeSearchCount(tetSearchGroup, trackedEntityType, orgUnit);
                }
                return 0;
            },function(error){
                return 0;
            });
        }else{
            var def = $q.defer();
            def.resolve(0);
            return def.promise;
        }
    }
    var tetScopeSearchCount = this.tetScopeSearchCount = function(tetSearchGroup, trackedEntityType, orgUnit){
        var params = getSearchParams(tetSearchGroup, null, trackedEntityType, orgUnit, null, searchScopes.TET);
        if(params){
            return TEIService.searchCount(params.orgUnit.id, params.ouMode,null, params.programOrTETUrl, params.queryUrl, null, false).then(function(response){
                if(response){
                    return response;
                }
                return 0;
            },function(error){
                return 0;
            });
        }else{
            var def = $q.defer();
            def.resolve(0);
            return def.promise;
        }
    }

    this.findTetSearchGroup = function(programSearchGroup, tetSearchConfig){
        var uniqueGroup = programSearchGroup.uniqueGroup;
        if (uniqueGroup) {
            var attributeId =
                programSearchGroup.attributes &&
                programSearchGroup.attributes.length > 0 &&
                programSearchGroup.attributes[0].id;

            if (!attributeId){
                return null;
            }

            return tetSearchConfig
                .searchGroups
                .find(group =>
                    group.uniqueGroup &&
                    group.attributes &&
                    group.attributes.length > 0 &&
                    group.attributes[0].id === attributeId);
        }

        return tetSearchConfig
            .searchGroups
            .find(group => !group.uniqueGroup);
    }

    this.findValidTetSearchGroup = function(programSeachGroup,tetSearchConfig, attributesById){
        for(var sg = 0; sg < tetSearchConfig.searchGroups.length; sg++){
            var searchGroup = tetSearchConfig.searchGroups[sg];
            for(var a=0; a < tetSearchConfig.searchGroups[sg].attributes.length; a++){
                var attr = tetSearchConfig.searchGroups[sg].attributes[a];
                var value = programSeachGroup[attr.id];
                if(value){
                    searchGroup[attr.id] = value;
                }
            }
            if(this.isValidSearchGroup(searchGroup, attributesById)){
                return searchGroup;
            }
        }
    }

    this.isValidSearchGroup = function(searchGroup, attributesById){
        var nrOfSetAttributes = 0;
        for(var key in searchGroup){
            var attr = attributesById[key];
            if(attr){
                if(attr.valueType === "TEXT" && searchGroup[key] && searchGroup[key].value !== "") nrOfSetAttributes++;
                else if(attr.valueType !== "TEXT" && attr.valueType === "TRUE_ONLY") nrOfSetAttributes++;
                else if(attr.valueType !== "TEXT" && attr.valueType !== "TRUE_ONLY" && searchGroup[key]) nrOfSetAttributes++;
            }
        }
        if(searchGroup.minAttributesRequiredToSearch > nrOfSetAttributes){
            return false;
        }
        return true;
    }

    this.programScopeSearch = function(programSearchGroup, tetSearchGroup, program, trackedEntityType, orgUnit, pager, sortColumn, onEditHeadersFromReponse){
        var params = getSearchParams(programSearchGroup, program, trackedEntityType, orgUnit, pager, searchScopes.PROGRAM);
        
        if(params){
            var programScopeFetchAsyncFn = (pager, sortColumn) => {
                var order = sortColumn && "order=" + sortColumn.id + ":" + sortColumn.direction;
                return TEIService
                    .search(params.orgUnit.id, params.ouMode, order, params.programOrTETUrl, params.queryUrl, pager, params.paging);
            };

            return programScopeFetchAsyncFn(params.pager, sortColumn).then(function(response){
                    if(response && response.rows && response.rows.length > 0){
                        if (onEditHeadersFromReponse) {
                            response.headers = onEditHeadersFromReponse(response.headers, program.programTrackedEntityAttributes);
                        }
                        var result = { data: response, callingScope: searchScopes.PROGRAM, resultScope: searchScopes.PROGRAM, onRefetch: programScopeFetchAsyncFn };

                        var def = $q.defer();
                        if(params.uniqueSearch){
                            result.status = "UNIQUE";
                        }else{
                            result.status = "MATCHES";
                        }
                        def.resolve(result);
                        return def.promise;
                    }else{
                        if(tetSearchGroup){
                            return tetScopeSearch(tetSearchGroup, trackedEntityType, orgUnit, pager, undefined, onEditHeadersFromReponse)
                                .then(function(result){
                                    result.callingScope = searchScopes.PROGRAM;
                                    return result;
                                },function(){
                                    return {status: "NOMATCH"};
                                });
                        }else{
                            var def = $q.defer();
                            def.resolve({status: "NOMATCH"});
                            return def.promise;
                        }

                    }
                },function(error){
                    var d = $q.defer();
                    if(error && error.data && error.data.message === "maxteicountreached"){
                        d.resolve({ status: "TOOMANYMATCHES", data: null});
                    } 
                    else {
                        d.reject(error);
                    }
                    return d.promise;
                });
        } else {
            var def = $q.defer();
            def.resolve({status: "NOMATCH"});
            return def.promise;
        }
    }
    var tetScopeSearch = this.tetScopeSearch = function(tetSearchGroup,trackedEntityType, orgUnit, pager, sortColumn, onEditHeadersFromReponse){
        var params = getSearchParams(tetSearchGroup, null, trackedEntityType, orgUnit, pager, searchScopes.TET);
        if(params){
            var tetScopeFetchAsyncFn = (pager, sortColumn) => {
                var order = sortColumn && "order=" + sortColumn.id + ":" + sortColumn.direction;
                return TEIService.search(params.orgUnit.id, params.ouMode, order, params.programOrTETUrl, params.queryUrl, pager, params.paging);
            }
            
            return tetScopeFetchAsyncFn(params.pager, sortColumn).then(function(response){
                if (onEditHeadersFromReponse) {
                    response.headers = onEditHeadersFromReponse(response.headers, trackedEntityType.trackedEntityTypeAttributes);
                }
                var result = {data: response, callingScope: searchScopes.TET, resultScope: searchScopes.TET, onRefetch: tetScopeFetchAsyncFn };
                if(response && response.rows && response.rows.length > 0){
                    if(params.uniqueSearch){
                        result.status = "UNIQUE";
                    }else{
                        result.status = "MATCHES";
                    }
                }else{
                    result.status = "NOMATCH";
                }
                return result;
            },function(error){
                var d = $q.defer();
                if(error && error.data && error.data.message === "maxteicountreached"){
                    d.resolve({ status: "TOOMANYMATCHES", data: null});
                } 
                else {
                    d.reject(error);
                }
                return d.promise;
            });
        }else{
            var def = $q.defer();
            def.resolve({status: "NOMATCH"});
            return def.promise;
        }
    }
})
.factory('RuleBoundFactory', function()
{
    var initData = function(){
        return {
            textInEffect: false,
            keyDataInEffect: false,
            displayTextEffects: {},
            displayKeyDataEffects: {}
        }
    }

    return {
        getDisplayEffects: function(ruleBoundData, event, ruleeffects, location){
            if(!ruleBoundData) ruleBoundData = initData();

            ruleBoundData.textInEffect = false;
            ruleBoundData.keyDataInEffect = false;
    
            //In case the 
            if(ruleBoundData.lastEventUpdated !== event) {
                ruleBoundData.displayTextEffects = {};
                ruleBoundData.displayKeyDataEffects = {};
                ruleBoundData.lastEventUpdated = event;
            }
            
            if(ruleeffects && ruleeffects[event]){
                angular.forEach(ruleeffects[event], function(effect) {
                    var g= 1;
                    var u = g+1;
                    if(effect.location === location){
                        //This effect is affecting the local widget
                        
                        //Round data to two decimals if it is a number:
                        if(dhis2.validation.isNumber(effect.data)){
                            effect.data = Math.round(effect.data*100)/100;
                        }
                        
                        if(effect.action === "DISPLAYTEXT") {
                            //this action is display text. Make sure the displaytext is
                            //added to the local list of displayed texts
                            if(!angular.isObject(ruleBoundData.displayTextEffects[effect.id])){
                                ruleBoundData.displayTextEffects[effect.id] = effect;
                            }
                            if(effect.ineffect)
                            {
                                ruleBoundData.textInEffect = true;
                            }
                        }
                        else if(effect.action === "DISPLAYKEYVALUEPAIR") {                    
                            //this action is display text. Make sure the displaytext is
                            //added to the local list of displayed texts
                            if(!angular.isObject(ruleBoundData.displayTextEffects[effect.id])){
                                ruleBoundData.displayKeyDataEffects[effect.id] = effect;
                            }
                            if(effect.ineffect)
                            {
                                ruleBoundData.keyDataInEffect = true;
                            }
                        }
                        else if(effect.action === "ASSIGN") {
                            //the dataentry control saves the variable and or dataelement
                        }
                    }
                });
            }

            return ruleBoundData;
        }
    }
})
.service('AccessUtils', function($q, TCStorageService){

    this.anyWritable = function(accessKeyValuePair){
        if(accessKeyValuePair){
            for(var accessKey in accessKeyValuePair){
                var access = accessKeyValuePair[accessKey];
                if(access && access.data && access.data.write) return true;
            }
        }
        return false;
    }
    this.isReadable = function(obj){
        if(obj && obj.access && obj.access.data && obj.access.data.read){
            return true;
        }
        return false;
    }
    this.isWritable = function(obj){
        if(obj.access && obj.access.data && obj.access.data.write){
            return true;
        }
        return false;
    }

    this.toWritable = function(arr){
        var service = this;
        if(!arr) return arr;
        var writable = [];
        angular.forEach(arr, function(obj){
            if(service.isWritable(obj)){
                writable.push(obj);
            }
        });
        return writable;
    }
})
.service('TCOrgUnitService', function($q, $rootScope, TCStorageService, OrgUnitFactory){
    this.get = function(uid) {
        var def = $q.defer();
        TCStorageService.currentStore.open().done(function(){
            TCStorageService.currentStore.get('organisationUnits', uid).done(function(orgUnit){
                $rootScope.$apply(function(){
                    def.resolve(orgUnit);
                });
            });
        });
        return def.promise;
    };

    this.getSearchOrgUnitTree = function(){
        return OrgUnitFactory.getSearchTreeRoot().then(function(res){
            var allSearchOrgUnits = res.organisationUnits;
            var filtered = allSearchOrgUnits.filter(function(orgUnit){
                return !isPathInOrgUnitList(orgUnit.path, allSearchOrgUnits);
            });
            return filtered;
        });
    }
    var getOrgUnitIdsFromPath = this.getOrgUnitIdsFromPath = function(orgUnitPath) {
        var formattedPath = orgUnitPath.replace(/^\/|\/$/g, '');
        return formattedPath.split('/');
    }
    var isPathInOrgUnitList = this.isPathInOrgUnitList = function(path, orgUnits){
        var idsFromPath = getOrgUnitIdsFromPath(path);
        var lastId = idsFromPath[idsFromPath.length-1];
        return idsFromPath.some(function(idFromPath){
            return orgUnits.some(function(orgUnit){
                return orgUnit.id === idFromPath && orgUnit.id !== lastId;
            });
        });
    }
});


