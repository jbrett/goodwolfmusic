/**
 * Created by 23rd and Walnut
 * www.23andwalnut.com
 * User: Saleem El-Amin
 * Date: 5/14/11
 * Time: 1:29 AM
 */

(function($) {


    $.fn.ttwMediaBox = function(arg1) {

        var data,
            mb = this.data('ttwMediaBox');

        // Method calling logic
        if (typeof mb !== 'undefined' && mb.api[arg1]) {

            var apiFunctionArgs = Array.prototype.slice.call(arguments, 1);

            return mb.api[arg1].apply(this, apiFunctionArgs);
        }
        else if (typeof arg1 === 'object') {

            //add the media box class
            this.addClass('ttwMediaBox');

            //create the media box object
            mb = new ttwMediaBox(this);

            //create the media box playlist
            data = mb.makePlaylist.apply(this, arguments);

            //initialize the media box
            mb.init(data.playlist, data.options);

            //save a reference to the media box object on the relevant selector
            this.data('ttwMediaBox', mb);

            return this;
        }
        else {
            $.error(arg1 + ' is not a valid method or playlist for ttwMediaBox');
        }
    };

    var ttwMediaBox = function(mediaBoxAnchor) {
        var self = this;

        this.$templates = '';
        this.current = 0;
        this.currentIsVideo = false;
        this.myPlaylist = [];
        this.layout = {};
        this.playlist = {};
        this.eventManager = {};
        this.options = {};
        this.cssSelector = {
            mediaBoxClass:'.ttwMediaBox',
            jPlayer:"#jquery_jplayer"
        };
        this.APP_MESSAGE = 'MEDIA BOX: ';

        this.version = { // Static Object
			script: "1.0.0",
			player: "jPlayer",
			playerVersion: "2.0.9"
		};

        this.$anchor = $(this.cssSelector.mediaBoxClass);

        this.eventManager = {

            //subscribe to an event
            subscribe: function(event, fn) {
                $(this).bind(event, fn);
            },

            //trigger an event, optionally store some data related to the event
            publish: function(event, data) {
                //store the data before triggering the event otherwise it wont be available to subscribed functions in time
                if (typeof data != 'undefined')
                    this.data[event] = data;
                

                //Important to log the event before triggering it, or the order in the console will be off
                if (self.options.debugEvents)
                    self.log('MB EVENT: ' + event);

                //TODO: Pass the event data through jQuery trigger. ie. trigger(event, data)
                $(this).trigger(event);
            },

            //get data associated with an event
            getData: function(event) {
                var data = this.data[event];
                this.clear(event);
                return data;
            }, //TODO: Bind allows you to pass data. see http://api.jquery.com/bind/

            //remove data that has been stored for an event
            clear: function(event) {
                delete this.data[event];
            },

            //store data related to a particular event
            //TODO: Change this to eventData, overuse of 'data' getting confusing
            data:{}
        };

        this.api = {
            swapPlaylist:function(playlist, callback) {
                var data = self.makePlaylist.call(this, playlist);
                self.myPlaylist = data.playlist;
                self.playlist.refreshPlaylist();
                self.runCallback(callback);
            },
            addPlaylistItem:function(index, item, callback) {
                self.playlist.addItem(index, item);
                self.runCallback(callback);
            },
            removePlaylistItem:function(index, callback) {
                self.playlist.removeItem(index);
                self.runCallback(callback);
            },
            movePlaylistItem:function(fromIndex, toIndex, callback){
                self.playlist.move(fromIndex, toIndex);
                self.runCallback(callback);
            },
            addWidget:function(options, callback) {
                var widget = self.layout.addWidget(options);
                self.runCallback(callback, widget);
            },
            removeWidget:function(anchor, callback) {
                self.layout.removeWidget(anchor);
                self.runCallback(callback);
            },
            makePrimary:function() {
                //swap this widgets data for the active data, re-init all elements
            },
            setOption:function() {
                self.setOption.apply(self, arguments);
            },
            getWidget:function(anchor) {
                return self.layout.getWidget(anchor);
            },
            play:function(){
                self.playlist.togglePlay();
            },
            next:function(){
                self.playlist.playlistNext();
            },
            prev:function(){
                self.playlist.playlistPrev();
            }
        };

        this.makePlaylist = function(arg1, arg2) {
            var self = this, playlist = [], options = {};

            if ($.isArray(arg1)) {
                playlist = arg1;
                options = arg2;
            }
            else {
                $.error('Unable to locate a valid playlist');
            }

            return {playlist:playlist, options:options};
        };

        this.getMetadata = function(data) {
            var filesToAnalyze = [], order, requestId, eventId, eventData;

            order = self.options.ID3.filePriority.split(' ');

            requestId = new Date().getTime();

            eventId = 'mbMetadataRetrieved-' + requestId;

            //since there can potentially be multiple versions of the same file (mp3, ogg, etc) figure out which one to use
            //to get the meta data based on the priority set in the settings
            for (var i = 0, len = data.length; i < len; i++) {

                //This variable keeps track of whether a valid file type has been found yet.
                var foundFileToAnalyze = false;

                for (var j = 0; j < order.length; j++) {
                    if (typeof data[i][order[j]] != 'undefined') {
                        filesToAnalyze.push(data[i][order[j]]);
                        foundFileToAnalyze = true;
                        break;
                    }

                    //If this is the last iteration through the valid file types, and the script has not found one to
                    //analyze, push an empty string on the array. This is necessary to ensure that number of files we
                    //send to the server matches the number of files in the playlist. If the lengths don't match, the
                    //meta data will get merged into the playlist at the incorrect indices
                    if (j == order.length - 1 && !foundFileToAnalyze) {
                        filesToAnalyze.push('');
                    }
                }
            }

            //Submit the files to the meta script
            $.post(self.options.ID3.ID3Script, {media:filesToAnalyze}, function(returnData) {
                var result = $.parseJSON(returnData);

                
                //If there were no errors, trigger the event, save the meta data
                //NOTE: Can not simply return the data since this is asynchronous. All calls to this function must subscribe to the created eventId to retrieve the data
                if (result !== null && result.status != 'error') {
                    eventData = result.media;
                }
                else {
                    eventData = false;

                    if (self.options.debug) {
                        if (result !== null)
                            log(result.error_msg);
                        else  log('There was an error retreiving meta data');
                    }
                }


                self.eventManager.publish(eventId, eventData);
            });

            return eventId;
        };

        this.runCallback = function(callback) {

            var functionArgs = Array.prototype.slice.call(arguments, 1);

            if ($.isFunction(callback)){
                callback.apply(this, functionArgs);
            }
        };

        this.log = function(){
            if (this.options.debug && window.console) {
                console.log(arguments);
            }
        };

        this.debugMessage = function(msg){
            if(this.options.debug){
                this.log(this.APP_MESSAGE + msg);
            }
        };

        if(mediaBoxAnchor.length === 0)
           $.error(this.APP_MESSAGE + 'You must initiate media box on a valid DOM element');

    };

    ttwMediaBox.prototype.defaultOpts = function() {
        return {
            showPlayer:true,
            playerAnchor: 'body',
            autoplay:false,
            trackWidgetLoads:true,
            widgets: [],
            ID3:{
                getID3:true,
                ID3Script:'/mediabox/dependencies/meta/get_meta.php',
                coverScript: '/mediabox/dependencies/meta/cover.php',
                filePriority: 'meta_path mp3 ogg oga'
            },
            interfaceMgr:{
                //cover = a manually specified album cover image, background = a manually specified large background image
                imageSources:{
                    AlbumCover:'ID3, cover, background',
                    ThumbList:'ID3, cover, background',
                    ThumbWall:'ID3, cover, background',
                    BackgroundImage:'background, ID3, cover',
                    Folders:'cover, ID3'
                },
                widgets: {
                    AdvancedList:{
                        rowHeight:30
                    },
                    Description:{
                        order:'title, artist, album',
                        autoSize:true,
                        fontSize:false,
                        titleFontSize:false,
                        artistFontSize:false,
                        albumFontSize:false
                    },
                    Folders: {
                        autoSize: true,
                        numFolders: 5,
                        folderSpace:.01,
                        folderSize:300,
                        folderMargin:12,
                        color: '#000',
                        widgetToLoad:'ThumbWall',
                        style:'normal',
                        useBackButton:false,
                        backButtonAction:false
                    },
                    ThumbWall:{
                        autoSize: true,
                        numThumbs: 5,
                        thumbSpace:.01,
                        thumbSize: 300,
                        thumbMargin:12,
                        color: '#000'
                    },
                    ThumbList:{
                        ellipsis:false
                    },
                    Video:{
                        width:"800px",
                        height:"450px",
                        manageVideoMarkup:true,
                        pseudoAnchor:false
                    }
                },
                scrollBarSize:8
            },
            debug:false,
            debugEvents:false,
            debugjPlayer:false,
            templates:{
                main: '/mediabox/dependencies/ttw.mediabox.templates.html'
            },
            jPlayer:{
                swfPath:'/mediabox/dependencies/jPlayer'
            }

        };
    };

    ttwMediaBox.prototype.setOption = function(option){
        var self = this, error = false;
        if (option == 'player') {

            //This is an option on the player, publish the event to let the player know, and pass the option value
            self.eventManager.publish('mbUpdatePlayerOptions', {option:arguments[1], value:arguments[2]});//player option
        }
        else {
            var optionArr = option.split('.'), value = arguments[1], optionStructure = self.options;

            //determine if the specified option exists on the options structure, if so get a reference to it
            for (var i = 0; i < optionArr.length; i++) {
                if (optionStructure[optionArr[i]])
                    optionStructure = optionStructure[optionArr[i]];
                else {
                    //The specified parameter does not exist on the options object
                    error = true;
                    optionStructure = false;
                }
            }

            if (optionStructure) {
                //set the option based on type (string or object)
                if ((typeof optionStructure == 'object' && optionStructure !== null) && (typeof value == 'object' && value !== null)) {
                    $.extend(true, optionStructure, value);
                }
                else if (typeof optionStructure == typeof value) {
                    optionStructure = value;
                }
                else error = true;
            }
        }

        if (error) {
            if (self.options.debug) {
                $.error('Incorrect option name or value');
            }
        }
    };

    ttwMediaBox.prototype.init = function(myPlaylist, options) {
        var self = this;

        self.myPlaylist = myPlaylist;

        //If secondary and primary widgets are initially defined with the same data set, this is the reason the
        //secondary widget will get a copy of the data rather than a reference to it. Ties into the re-init of
        //secondary widgets required after metadata is retrieved in interfaceMgr.startWidget
        self.options = $.extend(true, {}, self.defaultOpts(), options);

        self.debugMessage('Media Box Started');

        self.eventManager.subscribe('mbComponentsLoaded', function() {

            self.playlist = self.playlistMgr();

            self.layout = self.interfaceMgr();

            //manually calling the init events to allow for the possibility of running some pre-init code such as the
            //failed attempt to anchor the video player
            self.playlist.init();

            self.layout.init();
        });

        self.load();
    };

    ttwMediaBox.prototype.playlistMgr = function() {
        var self = this,
                playing = false,
                isSeekbarSliding = false,
                $myJplayer = {},
                $mySeekbar = {},
                cssSelector = {
                    jPlayer: self.cssSelector.jPlayer,
                    jPlayerInterface: '.jp-interface',
                    playerPrevious: ".jp-interface .jp-previous",
                    playerNext: ".jp-interface .jp-next",
                    seekbar: '.jp-seek-bar',
                    volumeIndicator: '.jp-volume-indicator',
                    volumeSlider: '.mb-volume-slider',
                    volumeHandle: '.mb-volume-handle'

                },
                preloadImgs = [
//                    'images/player-play-active.png',
//                    'images/player-pause.png',
//                    'images/player-pause-active.png',
//                    'images/player-next-active.png',
//                    'images/player-prev-active.png'
                ];


        function init() {


            buildPlayerHTML(self.options.playerAnchor);

            $myJplayer = $(cssSelector.jPlayer);
            $mySeekbar = $(cssSelector.seekbar);

            var jPlayerDefaults, jPlayerOptions;

            jPlayerDefaults = {
                swfPath: "/dependencies/jPlayer",
                supplied: "mp3, m4a, m4v, oga, ogv, wav",
                cssSelectorAncestor:  cssSelector.jPlayerInterface,
                preload: 'auto',
                errorAlerts: self.options.debugjPlayer,
                warningAlerts: self.options.debugjPlayer,
                fullScreen: false,
                size: {
                    width: "800px",
                    height: "450px",
                    cssClass: "show-video"
                },
                sizeFull: {
                    width: "100%",
                    height: "90%",
                    cssClass: "show-video-full"
                }
            };

            //apply any user defined jPlayer options
            jPlayerOptions = $.extend(true, {}, jPlayerDefaults, self.options.jPlayer);

            $myJplayer.bind($.jPlayer.event.ready, function() {
                self.debugMessage('jPlayer Ready');

                //Bind jPlayer events. Do not want to pass in options object to prevent them from being overridden by the user
                $myJplayer.bind($.jPlayer.event.loadstart, function(event) {
                      publishVideoEvents(event);
                });

                $myJplayer.bind($.jPlayer.event.ended, function(event) {
                    playlistNext();
                });

                $myJplayer.bind($.jPlayer.event.play, function(event) {
                    $(this).jPlayer("pauseOthers");
                    publishVideoEvents(event);
                    //TODO: Don't need to call this (publishVideoEvents) in play and loadstart handlers if the player waits for the entire interface to finish loading before calling init playlist. That way all widgets are set up and they will not miss any events published by the player. This will require keeping track of all calls to meta regardless of whether they are successful
                });

                $myJplayer.bind($.jPlayer.event.timeupdate, function(event) {
                    if (!isSeekbarSliding)
                        $mySeekbar.slider("option", "value", $myJplayer.data("jPlayer").status.currentPercentRelative);
                });

                $myJplayer.bind($.jPlayer.event.playing, function(event) {
                    playing = true;
                });

                $myJplayer.bind($.jPlayer.event.pause, function(event) {
                    playing = false;
                });

                //Bind next/prev click events
                $(cssSelector.playerPrevious).click(function() {
                    playlistPrev();
                    $(this).blur();
                    return false;
                });

                $(cssSelector.playerNext).click(function() {
                    playlistNext();
                    $(this).blur();
                    return false;
                });

                $(cssSelector.volumeIndicator).click(function(){
                    $(this).next(cssSelector.volumeBar).toggleClass('show');
                });

                $(cssSelector.volumeSlider).unbind('click');
                $(cssSelector.volumeSlider).click(function(e){
                    var y, volumeBarPosition, volume;

                    y = parseInt(e.clientY);
                    volumeBarPosition = $(this).offset();
                    volume = (100 - (y - volumeBarPosition.top));

                    $myJplayer.jPlayer("volume", volume/100);

                    $(this).find(cssSelector.volumeHandle).css('top', 100 - volume);

                });

                //Initiate the seekbar //TODO: Disable click, only drag
                $mySeekbar.slider({
                    step:.001,
                    start: function() {
                        isSeekbarSliding = true;
                    },
                    stop: function() {
                        isSeekbarSliding = false;
                    },
                    change:function(event, ui) {
                        if (typeof event.originalEvent != 'undefined') {
                            $myJplayer.jPlayer("playHead", ui.value);
                        }
                    }
                });

                self.eventManager.subscribe('mbInitPlaylistAdvance', function(e) {
                    var changeTo = this.getData('mbInitPlaylistAdvance');

                    if (changeTo != self.current) {
                        self.current = changeTo;
                        playlistAdvance(self.current);
                    }
                    else {
                        if(!$myJplayer.data('jPlayer').status.srcSet)
                        {
                            playlistAdvance(0);
                        }
                        else{
                            togglePlay();
                        }

                    }
                });

                self.eventManager.subscribe('mbInitPlaylistChange', function() {
                    var playlistChange = this.getData('mbInitPlaylistChange');

                    if (playlistChange.action == 'add')
                        addItem(playlistChange.index, playlistChange.item);
                    else removeItem(playlistChange.index);
                });

                self.eventManager.subscribe('mbInitPlaylistMove', function() {
                    var moveData = this.getData('mbInitPlaylistMove');

                    move(moveData.old_index, moveData.new_index);
                });

                self.eventManager.subscribe('mbUpdatePlayerOptions', function(){
                    var data = self.eventManager.getData('mbUpdatePlayerOptions');

                    $myJplayer.jPlayer("option", data.option, data.value);
                });

                //Don't start the playlist until all the widgets are loaded
                self.eventManager.subscribe('mbAllWidgetsLoaded', function() {
                    playlistInit(self.options.autoplay);
                });

                TTWUtils.preloadImages(preloadImgs);

                buildPlaylist();

                //If the user doesn't want to wait for widget loads, start playlist now
                if(!self.options.trackWidgetLoads)
                    self.eventManager.publish('mbAllWidgetsLoaded');

            });

                        //Initialize jPlayer
            $myJplayer.jPlayer(jPlayerOptions);

        }

        function buildPlaylist() {

             self.eventManager.subscribe('mbMetadataRetrieved', function() {

                /**
                 * Make sure all required fields have a value, even if the value is an empty string.
                 * Advanced List is the only element that currently requires all fields
                 */

                //The list of fields that are required
                var requiredFields = ['name', 'artist', 'album', 'play_length'];

                //The list of fields that can be used as the 'name' if it isn't populated
                var substituteNameFields = ['mp3', 'oga'];

                for (var i = 0; i < self.myPlaylist.length; i++) {

                    //loop through each required field and make sure it has a value
                    for (var j = 0; j < requiredFields.length; j++) {

                        if (typeof self.myPlaylist[i][requiredFields[j]] == 'undefined') {

                            //if the current undefined field is 'name', populate it from the file name
                            if (requiredFields[j] == 'name') {

                                //loop through the list of file names that can be substituted until we find one that is populated
                                for (var k = 0; k < substituteNameFields.length; k++) {
                                    if (typeof self.myPlaylist[i][substituteNameFields[k]] != 'undefined')
                                        self.myPlaylist[i].name = self.myPlaylist[i][substituteNameFields[k]].split('/').pop();
                                }
                            }
                            else {
                                //Every other field just gets an empty string
                                self.myPlaylist[i][requiredFields[j]] = '';
                            }
                        }
                    }
                }

                //Let the application know that playlist pre-processing has finished
                self.eventManager.publish('mbPlaylistBuilt');
            });


            if (self.options.ID3.getID3) {

                var eventId = self.getMetadata(self.myPlaylist);

                self.eventManager.subscribe(eventId, function() {

                    var meta = this.getData(eventId);

                    if (meta) {
                        $.extend(true, self.myPlaylist, meta);
                    }

                    self.eventManager.publish('mbMetadataRetrieved');
                });
            }
            else {
                //Meta Data option isn't enabled. Trigger the event so the script can move forward.
                self.eventManager.publish('mbMetadataRetrieved');
            }
        }

        //Player HTML need to be built in the playlistMgr because jPlayer will not function without it. All jPlayer logic
        //is contained within playlistMgr
        function buildPlayerHTML(anchor) {

            var $anchor = $(anchor);

            if($anchor.length === 0 ){
                $anchor = $('body');
                self.debugMessage("The supplied player anchor is invalid. The player has been anchored to 'body'");
            }


            $anchor.append(self.$templates.tmpl({type:'player-interface', showPlayer: self.options.showPlayer}));

            //These next two statements are referencing the Media Box anchor, not the player anchor
            self.$anchor.addClass(cssSelector.jPlayerInterface.substr(1));

            self.$anchor.append(self.$templates.tmpl({type:'player'}));
        }

        function playlistInit(autoplay) {
            self.current = 0;

            if (autoplay) {
                playlistAdvance(self.current);
            }
            else {
                playlistConfig(self.current);
            }
        }

        function playlistConfig(index) {
            self.current = index;
            $myJplayer.jPlayer("setMedia", self.myPlaylist[self.current]);
        }

        function playlistAdvance(index) {
            playlistConfig(index);
            self.eventManager.publish('mbPlaylistAdvance');
            $myJplayer.jPlayer("play");
        }

        function playlistNext() {
            var index = (self.current + 1 < self.myPlaylist.length) ? self.current + 1 : 0;
            playlistAdvance(index);
        }

        function playlistPrev() {
            var index = (self.current - 1 >= 0) ? self.current - 1 : self.myPlaylist.length - 1;
            playlistAdvance(index);
        }

        function togglePlay() {
            if (!playing)
                $myJplayer.jPlayer("play");
            else $myJplayer.jPlayer("pause");
        }

        function refreshPlaylist() {
            playlistInit();
            self.eventManager.publish('mbPlaylistRefresh');
            self.eventManager.publish('mbMetadataRetrieved');
        }

        function move(old_index, new_index) {

            if (new_index < old_index)
                new_index++;

            self.myPlaylist.splice(new_index, 0, self.myPlaylist.splice(old_index, 1)[0]);

            self.eventManager.publish('mbPlaylistItemMoved', {old_index:old_index, new_index:new_index});
            //TODO: THis needs its own handler, not the refresh swapp handler
        }

        function addItem(index, item) {
            self.myPlaylist.splice(index, 0, item);

            //publish the event, store the added item, the items index, and the action
            self.eventManager.publish('mbPlaylistChange', {action:'add', index:index, item:item}); //TODO: should this be two separate events? One for add and one for remove
        }

        function removeItem(index) {
            self.myPlaylist.splice(index, 1);

            //publish the event, store the index and action
            self.eventManager.publish('mbPlaylistChange', {action:'remove', index:index});
        }

        function publishVideoEvents(event) {
            if (event.jPlayer.status.video) {
                self.currentIsVideo = true;
                self.eventManager.publish('mbVideoLoad');
            }
            else if (self.currentIsVideo) {
                self.currentIsVideo = false;
                self.eventManager.publish('mbVideoEnd');
            }
        }

        return{
            init:init,
            playlistInit:playlistInit, //TODO: Why am i returning some of these
            playlistAdvance:playlistAdvance,
            playlistNext:playlistNext,
            playlistPrev:playlistPrev,
            refreshPlaylist:refreshPlaylist,
            togglePlay:togglePlay,
            move:move,
            addItem:addItem,
            removeItem:removeItem,
            $myJplayer:$myJplayer
        };
    };

    ttwMediaBox.prototype.interfaceMgr = function () {
        var self = this, interfaceApi, ThumbList, Description, AlbumCover, List, ThumbWall, BackgroundImage, AdvancedList, Widget, Folders, Video,
                nextWidgetId = 0,
                widgetNames = {
                    advancedList:'AdvancedList',
                    albumCover:'AlbumCover',
                    backgroundImage:'BackgroundImage',
                    description:'Description',
                    folders:'Folders',
                    list:'List',
                    thumbList:'ThumbList',
                    thumbWall:'ThumbWall',
                    video:'Video'
                },
                cssSelector = { //TODO: Refactor css selectors
                    thumbList:'#mb-thumb-list',
                    thumbListInnerClass:'.mb-thumb-list',
                    thumbListItemClass:'.mb-thumb-list-item',
                    thumbListTitle:'.mb-thumb-title',
                    list: "#jp_playlist",
                    listItemId: "#jp_playlist_item_",
                    listItemClass: ".jp_playlist_item",
                    listItemLastClass: ".jp-playlist-last",
                    advancedList:'.mb-advanced-list',
                    albumCover: "#mb-album-cover",
                    albumCoverItemClass: '.mb-album-cover',
                    albumCoverHighlightClass: ".mb-album-cover-highlight",
                    thumbWall:'#mb-thumb-wall',
                    thumbWallInnerClass:'.mb-thumbWall',
                    thumbWallItemId: '#mb-thumb-wall-item',
                    thumbWallItemClass:'.mb-thumb-wall-item',
                    thumbWallItemInnerClass:'.mb-thumb-inner',
                    backgroundImage: '.mb-background-image-container',
                    backgroundImageImg: '.mb-background-image',
                    foldersClass:'.mb-folders',
                    foldersItemClass:'.mb-folder',
                    descriptionItemClass:'.mb-description',
                    scrollContent:'.scroll-content',
                    tempContainer:'.temp-container',
                    AdvancedList:{
                        itemClass:'.slick-row'
                    },
                    AlbumCover:{
                        itemClass:'.mb-album-cover'
                    },
                    BackgroundImage:{
                        itemClass:'.mb-background-image-container'
                    },
                    Description:{
                        itemClass:'.mb-description',
                        titleSelector:'.mb-title p',
                        albumSelector:'.mb-album p',
                        artistSelector:'.mb-artist p'
                    },
                    Folders:{
                        itemClass:'.mb-folder',
                        folderBackButton:'.mb-folder-back-button',
                        switcher:'.mb-folder-switcher',
                        switcherViewport:'.folders-viewport',
                        switcherNext:'.next-folder',
                        switcherPrev:'.prev-folder'
                    },

                    List:{
                        wrapper:'.mb-list',
                        itemClass:'.jp_playlist_item' //TODO:Needs to change
                    },
                    ThumbList:{
                        itemClass:'.mb-thumb-list-item',
                        widgetContainer: '.mb-thumb-list-container'
                    },
                    ThumbWall:{
                        itemClass:'.mb-thumb-wall-item'
                    },
                    Video:{
                        wrapper:'#mb-player',
                        show:'.mb-show-video',
                        hide:'.mb-hide-video',
                        videoPlay:'.jp-video-play',
                        fullScreen:'jp-full-screen',
                        restore:'jp-restore-screen'
                    },
                    Widget:{},
                    widgetMarkup: '.mb-widget-markup',
                    widgetClass:'.mb-widget',
                    itemPlayingClass:'.mb-item-playing',
                    jPlayerInterface:'jp-interface',
                    jPlayer: self.cssSelector.jPlayer

                },
                validWidgets = [widgetNames.thumbList, widgetNames.list, widgetNames.advancedList, widgetNames.albumCover,
                    widgetNames.description, widgetNames.backgroundImage, widgetNames.thumbWall, widgetNames.folders, widgetNames.video];

        this.activeElements = {}; //todo: local variable!

        function init() {

            //update all active interface elements when the playlist advances (forward or backward)
            self.eventManager.subscribe('mbPlaylistAdvance', function() {
                $.each(self.activeElements, function(i, element) {
                    if (!element.isSecondary) //Only advance the primary widgets
                        element.instance.doAdvance();
                });
            });

            //initiate active interface components when the playlist has been built
            // OR update active interface components if the playlist is refreshed (swapped)
            self.eventManager.subscribe('mbPlaylistRefresh mbPlaylistBuilt mbListUpdated mbPlaylistItemMoved', function(e) {
                //this will track the number of widgets loaded and publish an event when all are loaded
                if(self.options.trackWidgetLoads)
                    trackWidgetLoads();

                initWidgets(e);
            });

            //update active interface components when items are added or removed from the playlist
            self.eventManager.subscribe('mbPlaylistChange', function() {

                var eventData, elementsToNotify;

                //get any data stored for this event
                eventData = this.getData('mbPlaylistChange');

                //list of interface elements that need to be notified when elements are added and removed
                elementsToNotify = [widgetNames.list, widgetNames.thumbWall, widgetNames.thumbList];

                //call add or remove for each element that needs to be notified, passing in relevant data

                $.each(self.activeElements, function(anchor, widget) {

                    //if the active element is in elementsToNotify and it is not a secondary widget call add or remove
                    if (($.inArray(widget.type, elementsToNotify) != -1) && !widget.instance.isSecondary) {
                        if (eventData.action == 'add') {
                            widget.instance.add(eventData.item, eventData.index);
                        }
                        else if (eventData.action == 'remove') {
                            widget.instance.remove(eventData.index);
                        }
                    }
                });


            });

        }

        function initWidgets(event) {
            //call the  init function for each of the desired components
            for (var i = 0; i < self.options.widgets.length; i++) {
                //get the options for this widget
                var widgetParameters = self.options.widgets[i];

                if ($.inArray(widgetParameters.widgetName, validWidgets) != -1) {

                    if (!ignoreEventForThisWidget(event, widgetParameters)) {

                         if(widgetParameters.widgetName == 'Video' && !widgetParameters.anchor)
                                widgetParameters.anchor = 'body'; //Make sure the video widget has an anchor defined even thought it isn't used

                        if (typeof widgetParameters.anchor != 'undefined' ) {

                            //add the widget if it doesn't already exist
                            if (typeof self.activeElements[widgetParameters.anchor] == 'undefined') {
                                interfaceApi.addWidget(widgetParameters);//TODO: We don't want new components created on refresh etc, just when its started
                            }
                            else {
                                //if the widget already exists and it is not a secondary widget, re-initialize
                                //Notes: Secondary widgets are not tied to the primary playlist.
                                // This function is called in two scenarios:
                                // 1) plugin initialization
                                // 2) when the primary playlist changes.
                                // This branch will only be triggered in the second scenario, which secondary widgets don't care about
                                if (!widgetParameters.isSecondary)
                                    self.activeElements[widgetParameters.anchor].instance.init(widgetParameters.anchor, widgetParameters);
                            }
                        }
                    }
                }
                else if (self.options.debug) {
                    $.error('Invalid widget type (' + widgetParameters.widgetName + ')'); //TODO: Is there a better function than error
                }

            }
        }

        function ignoreEventForThisWidget(event, widgetParameters){
            //Make sure the advanced list doesn't re-initialize itself when a sort or move is performed. Only the other
            // elements need to be re-initialized. Slick Grid will handle itself
            return ((event.type == 'mbListUpdated' || event.type == 'mbPlaylistItemMoved') && widgetParameters.widgetName == 'AdvancedList');

        }

        //add the interface element to the active elements
        function register(instance) {
            //TODO: Type doesn't get used. Refactor to just save the instance directly. Remove calls to activeElement.instance.
            var element = {
                type:instance.type,
                instance: instance
            };

            self.activeElements[instance.anchor] = element;
        }

        //remove the interface element from the active elements
        function unregister(anchor) {

            if (typeof self.activeElements[anchor] != 'undefined') {

                //remove the element from the dom,
                self.activeElements[anchor].instance.$element.remove();

                //remove any extra markup that may have been inserted with this widget
                self.activeElements[anchor].instance.removeMarkup();

                //unbind the events created by this widget (i.e. resize events are bound to the window)
                self.activeElements[anchor].instance.destroy();

                //then delete it from the active elements array
                delete self.activeElements[anchor];
            }

        }

        //determine if the interface element already exists on the page
        function elementExists(anchor) {
            return typeof self.activeElements[anchor] != 'undefined';
        }

        //get an image for the specified interface element and playlist item
        function getImage(interfaceElem, data, index) {

            var img = false,
                    source,
                    sources = self.options.interfaceMgr.imageSources[interfaceElem].split(', '),
                    index = (typeof index == 'undefined') ? self.current : index; //if index isn't defined get the the currently playing items image

            //loop through the image sources for this interface element and try to find an image
            for (var i = 0, len = sources.length; i < len; i++) {
                source = $.trim(sources[i]);

                //if the source is id3, and the meta script indicates this file has cover, get it
                if (source == 'ID3' && self.options.ID3.getID3 && data[index].meta_cover == 1) {

                    //the img src is dynamic link ie cover.php?filename=audio.mp3
                    img = self.options.ID3.coverScript + '?filename=' + data[index].meta_file_path;
                    break;
                }
                else if (typeof data[index][source] != 'undefined') {

                    //if the source isn't id3 and there is a value for this image source, use it. break from loop.
                    img = data[index][source];
                    break;
                }
            }

            return img;
        }

        function addItemToElement(interfaceElement, $addElement, selector, idPrefix, index) {

            var $currentlyAtIndex,  $element, elementItems;

            $element = interfaceElement.$element;

            elementItems = $element.find(selector);

            if (index >= elementItems.length) {
                //add item to the end
                elementItems.last().after($addElement);
            }
            else {
                //get the element currently at the desired index, and insert the new element at the position
                $currentlyAtIndex = elementItems.eq(index);
                $currentlyAtIndex.before($addElement);
            }
            //set the element index
            $addElement.data('index', index);
            interfaceElement.applyItemClickEvent();
            renumberElements(interfaceElement, selector, index, idPrefix);
        }

        function renumberElements(interfaceElement, selector, startIndex, idPrefix) {
            var $elementsToRenumber, renumberFrom;

            //get the list of elements to renumber, using startIndex - 1 because we want to inlcude the elem at startIndex in the jQuery gt selector
            $elementsToRenumber = interfaceElement.$element.find(selector + ':gt(' + (startIndex - 1) + ')');

            //use index + 1 since index now references the element we just created
            renumberFrom = startIndex;


            //loop through the elements and update data and id (or class if it is a list as well as odd/even)
            $elementsToRenumber.each(function(index) {

                var newIndex = parseInt(renumberFrom) + index;

                if (interfaceElement.type == 'list') {
                    //determine odd or even class, using +1 because list index starts at 0, which is even but humans count from 1
                    $(this).data('index', newIndex).removeClass('odd even').addClass(( (index + 1) % 2 === 0) ? 'even' : 'odd');
                }
                else $(this).data('index', newIndex); //.attr('id', idPrefix + '-' + newIndex);
            });
        }

        function setData(instance, isSecondary, data) {
            if (typeof isSecondary != 'undefined')
                instance.isSecondary = isSecondary;

            if (!isSecondary)
                instance.data = self.myPlaylist;
            else instance.data = data;
        }

        function addWidget(options) {
            if (!options.anchor || !options.widgetName)
                $.error('Invalid anchor or widget');

            if ($.inArray(options.widgetName, validWidgets) != -1) {

                var defaults = {
                    isSecondary:false,
                    data:null
                };

                options = $.extend(defaults, options);

                var widget = new interfaceApi[options.widgetName]();

                widget.loadEventId = 'mbWidgetLoaded-' + new Date().getTime();

               self.eventManager.subscribe(widget.loadEventId, function(e){
                    self.runCallback(options.callback, widget);
                });

                widget.init(options.anchor, options);

               //TODO: SHould this be moved to initWidgets? Could potentially result in two callback calls using api addWidget if callbak is defined in options and as a parameter to the addWidget api function

                return widget;
            }
            else $.error('Invalid Widget Name');
        }

        function removeWidget(anchor) {
            //TODO: SHould probably just change the name of unregister to removeWidget
            unregister(anchor);
        }

        function startWidget(widget, anchor, options) {

            var waitForMeta = false;

            widget.anchor = anchor;

            widget.$anchor = $(anchor);

            //Stop if the anchor doesn't exist
            if (!widget.$anchor.length) {
                $.error('Invalid widget anchor (' + anchor + ')');
                return false;
            }

            //Make sure there is only one widget per anchor
            if (elementExists(anchor))
                removeWidget(anchor);


            setData(widget, options.isSecondary, options.data);

            //If this is a secondary widget, and the metadata hasn't been retreived, get it now
            //Folders will get its own metadata.
            if (self.options.ID3.getID3 && options.isSecondary && widget.type != 'Folders' && !metadataRetrieved(options.data)) {
                var meta, eventId;

                waitForMeta = true;

                eventId = self.getMetadata(options.data);

                self.eventManager.subscribe(eventId, function() {
                    meta = self.eventManager.getData(eventId);

                    $.extend(true, widget.data, meta);

                    //The widget needs to be re-rendered once the meta data is retreived
                    widget.doRender();

                    notifyWidgetLoaded(widget);
                });
            }


            widget.id = 'ttwMediaBoxWidget_' + nextWidgetId++;

            widget.setOptions(options);

            widget.insertMarkup();

            widget.doRender();

            //TODO:Decide if this should be implemented
//            if (options.events){
//                widget.bindEventMap(options.events);
//            }

            register(widget);

            if(!waitForMeta){
                notifyWidgetLoaded(widget);
            }

            return widget;
        }

        function metadataRetrieved(data) {
            //If there is data, and the first element has metadata, assume all do
            return (typeof data != 'undefined' && data.length && data[0].meta_attempted);

        }

        function getTileSize($anchor, tileSpace, numTilesPerRow, totalTiles, init) {

            var anchorWidth, anchorHeight, size, scrollBarSize, optsScrollBarSize = self.options.interfaceMgr.scrollBarSize;

            anchorHeight = $anchor.height();
            anchorWidth = $anchor.width();

            //determine if we should account for the space taken up by the scrollbar
            scrollBarSize = anchorHeight < $anchor.find(cssSelector.scrollContent).height() ? optsScrollBarSize : 0;

            var thumbSpace = anchorWidth * tileSpace;

            if (init === true) {
                //if this is an init, the tiles haven't been added to the dom yet, so the the height is 0. We
                //need to estimate the size to determine whether space should be reserved for the scroll bar
                //Remember: numThumbs is the numThumbs per row
                var estSize = Math.floor((anchorWidth - (thumbSpace * numTilesPerRow * 2) ) / numTilesPerRow),
                        estNumRows = totalTiles / numTilesPerRow,
                        estHeight = estSize * estNumRows;

                scrollBarSize = anchorHeight < estHeight ? optsScrollBarSize : 0;
            }

            //The width of hte container, minus the total width of the space between thumbs (margins) / number of tiles. Multiply space(margins) by two becasue there are margins on both sides
            size = Math.floor(((anchorWidth - scrollBarSize) - (thumbSpace * numTilesPerRow * 2) ) / numTilesPerRow);

            //Make sure there is a valid value for size
            if (size <= 0) {

                if (self.options.debug)
                    $.error('Invalid thumb size (' + size + '). Please check your value for thumb space');

                size = false;
            }

            return (size !== false) ? {size: size, space: thumbSpace} : false;

        }

        function getClass(classString){
            return classString.substr(1);
        }

        function trackWidgetLoads(){
            //Determine if all the widgets are loaded and publish an event if they are
            var widgetsLoaded = 0;

            self.eventManager.subscribe('mbWidgetLoaded', function(e){
                widgetsLoaded++;

                if(self.options.widgets.length == widgetsLoaded){
                    self.eventManager.publish('mbAllWidgetsLoaded');
                }
            });

            //if there are no widgets to load, trigge
            if(!self.options.widgets.length)
             self.eventManager.publish('mbAllWidgetsLoaded');
        }

        function notifyWidgetLoaded(widget){
            //This function is called by startWidget for all widgets except Video, which calls it internally
            self.eventManager.publish('mbWidgetLoaded');

            //publish the load event for this specific widget
            if(widget){
                self.eventManager.publish(widget.loadEventId);
            }
        }

        function getWidget(anchor){
            if(self.activeElements[anchor])
                return self.activeElements[anchor].instance;
            else return false;
        }

        /** Base Widget
         *  All widgets inherit the from the base widget **/
        Widget = function() {
            this.type = 'Widget';
            this.id = '';
            this.anchor = '';
            this.$anchor = {};
            this.$element = {};
            this.options = {};
            //necessary for the scroll bar
            this.scrollableElement = {};
            this.data = [];
            this.isSecondary = false;
            this.$insertedMarkup = false;

            //event id that is fired when this widget is finished loading
            this.loadEventId = '';
        };

        Widget.prototype.destroy = function() {
            $(window).unbind('.' + this.id);
        };

        Widget.prototype.bindEvents = function(events, target, live) {
        //custom bind function to make sure all widget events are namespaced. This is necessary for the destroy function
        //which unbinds only those events specific to this widget
        //Note: Use this function if there is only one target, use bindEventMap if there are multiple targets
            if (typeof target == 'undefined')
                target = this.$element;

            var namespacedEvents = {}, $target = $(target), widgetId;

            //exit if the target doesn't exist (i.e. incorrect selector
            if (!$target.length) {
                return false;
            }

            //used to namespace the events
            widgetId = this.id;

            $.each(events, function(event, action) {
                namespacedEvents[event + '.' + widgetId] = action;
            });

            if(!live)
                $target.bind(namespacedEvents);
            else $target.live(namespacedEvents);

        };

        Widget.prototype.bindEventMap = function(eventMap) {
            if (typeof eventMap == 'undefined')
                return false;

            var thisWidget = this;

            //loop thought each item
            //the key (or 'i' in the loop below, isn't used and can be named anything. Its simply three as a descriptor
            $.each(eventMap, function (i, item) {
                thisWidget.bindEvents(item.events, item.selector, item.live);
            });
        };

        Widget.prototype.setOptions = function(options) {
            this.options = $.extend(true, {}, self.options.interfaceMgr.widgets[this.type], options);
        };

        Widget.prototype.preRenderProcessing = function() {
            if (this.$element.length) {
                this.$element.remove();
            }
        };

        Widget.prototype.postRenderProcessing = function() {
            //make sure the widget has the default widget class
            //ad the widget anchor as an html5 data attribute (so the widget always knows where its anchored. Used in click events
            this.$element.addClass(cssSelector.widgetClass.substr(1)).attr('id', this.id).attr('data-anchor', this.anchor);
        };

        Widget.prototype.doRender = function() {
            this.preRenderProcessing();
            this.render();
            this.postRenderProcessing();
        };

        Widget.prototype.itemSelector = function() {
            //Helper method to get a jquery selector for all the items in this particular widget
            //TODO: Investigate why events bound with  this.anchor + ' ' + cssSelector[this.type].itemClass are not destroyed with the destroy function.
            return '#' + this.id + ' ' + cssSelector[this.type].itemClass;
        };

        Widget.prototype.itemOnClick = function(e, widget, itemIndex) {
            var $this, widgetAnchor;

            //The only widget that will pass the variables 'widget' and 'itemIndex' is the advanced list widget.
            //This is because it is using slick's built in click handler (the recommended method) rather than jQuery's
            //'this' refers to the item clicked, not the widget
            if (typeof widget == 'undefined') {
                $this = $(this);

                itemIndex = $this.data('index');

                widgetAnchor = $this.parents(cssSelector.widgetClass).attr('data-anchor');

                widget = self.activeElements[widgetAnchor];
            }


            if (!widget.instance.isSecondary) {
                widget.instance.primaryClickAction(widget, itemIndex);
            }
            else {
                widget.instance.secondaryClickAction(widget, itemIndex);
            }
        };

        Widget.prototype.primaryClickAction = function(widget, itemIndex) {
            if (!this.userClickAction(widget, itemIndex))
                self.eventManager.publish('mbInitPlaylistAdvance', itemIndex);

        };

        Widget.prototype.secondaryClickAction = function(widget, itemIndex) {
            if (!this.userClickAction(widget, itemIndex)) {
                var mediaToAdd, addPosition;

                mediaToAdd = widget.instance.data[itemIndex];
                addPosition = self.myPlaylist.length;

                self.eventManager.publish('mbInitPlaylistChange', {action:'add', index:addPosition, item:mediaToAdd});
            }
        };

        Widget.prototype.userClickAction = function(widget, itemIndex){
            var userClickAction = widget.instance.options.clickAction;

            if(userClickAction && $.isFunction(userClickAction))
                userClickAction(widget, itemIndex);
            else return false;
        };

        Widget.prototype.applyDefaultResizeEvent = function() {
            var thisWidget, event;

            thisWidget = this;

            event = {
                resize: function() {
                    thisWidget.resize();
                    self.runCallback(thisWidget.options.resizeCallback, thisWidget);
                }
            };

            this.bindEvents(event, window);
        };

        Widget.prototype.applyItemClickEvent = function() {

            var events = {
                item: {
                    selector:this.itemSelector(),
                    events:{
                        click:this.itemOnClick
                    }
                }
            };
            //bind the default event map to this widget
            this.bindEventMap(events);
        };

        Widget.prototype.insertMarkup = function() {

            if (this.options.markupToInsert) {
                //wrap the markup in a div and give it the markup class for this widget and the general markup class
                var markup = $('<div>').css('opacity', 0)
                        .addClass(this.markupClass().substr(1) + ' ' + cssSelector.widgetMarkup.substr(1))
                        .append(this.options.markupToInsert);

                if (this.options.insertPosition == 'prepend' || typeof this.options.insertPosition == 'undefined')
                    this.$anchor.prepend(markup);
                else this.$anchor.append(markup);

                //save a reference to the markup
                this.$insertedMarkup = markup;

                markup.animate({'opacity': 1}, 'fast');
            }
        };

        Widget.prototype.removeMarkup = function() {
            //this.$anchor.find(this.markupClass()).remove();
            if(this.$insertedMarkup)
                this.$insertedMarkup.remove();
        };

        Widget.prototype.markupClass = function() {
            return cssSelector.widgetMarkup + '-' + this.id;
        };

        Widget.prototype.advance = function() {
            //TODO: Should I just add an elementsToNotify list to the mbPlaylistAdvace handler insead of this function on the base widget
        };

        Widget.prototype.setCurrentlyPlaying = function() {
            var previousItemIndex, $previous, $current;

            //TODO: Send previous index with event, for a faster dom query
            $previous = this.$element.find(cssSelector.itemPlayingClass).removeClass(cssSelector.itemPlayingClass.substr(1));

            $current = this.$element.find(cssSelector[this.type].itemClass).eq(self.current);
            $current.addClass(cssSelector.itemPlayingClass.substr(1));
        };

        Widget.prototype.doAdvance = function(){
            this.advance();
            self.runCallback(this.options.mediaChangeCallback, this);
        };

        /** Widgets **/
        ThumbList = function () {

            this.type = 'ThumbList';

            this.init = function(anchor, options) {

                var thisInstance = startWidget(this, anchor, options);

                if (!thisInstance)
                    return false;

                //Setup event handler for thumb list item clicks
                this.applyItemClickEvent();

                //show the thumb list
                this.$element.find('.mb-thumb-list-wrapper').animate({opacity:1}, 'fast');

                //NOTE: THIS SCROLLBAR SCRIPT IS VERY DEPENDANT ON THE CSS. BE CAREFUL WHEN MAKING CHANGES
                this.scrollableElement = $('#' + this.id);//.tinyscrollbar({axis:'x'});

                this.scrollableElement.tinyscrollbar({axis:'x'});

                this.applyDefaultResizeEvent();

            };

            this.render = function() {
                var thumbListVars, $myThumbList, $myThumbListInner,   preloadImgs = [];

                //Create the thumb list from the template file
                thumbListVars = {
                    type:'thumb-list',
                    id:cssSelector.thumbList.substr(1)
                };

                $myThumbList = self.$templates.tmpl(thumbListVars);

                //Thumb list items get appended to the the inner element, not the wrapper (required for scrollbar func)
                $myThumbListInner = $myThumbList.find(cssSelector.thumbListInnerClass);

                //create a thumb list item for each playlist item
                for (var i = 0, len = this.data.length; i < len; i++) {

                    $myThumbListInner.append(this.createItem(i));
                }

                //TODO: jquery load plugin
                TTWUtils.preloadImages(preloadImgs, function() {
                    $(cssSelector.thumbListItemClass).find('img').animate({'opacity' : 1}, 'fast');
                });

                //add the thumb list to the document
                $(this.anchor).append($myThumbList);

                if (self.options.interfaceMgr.widgets.ThumbList.ellipsis) {
                    $myThumbList.find(cssSelector.thumbListTitle).ellipsis(false);
                }

                this.$element = $myThumbList;

                this.itemWidth = $myThumbListInner.find(cssSelector.thumbListItemClass + ':first').outerWidth(true);

                //set the width of the innner element
                this.setInnerWidth();

                //make sure the widget has the currently playing class, which wouldn't be added for the first element without this call
                if (!this.options.isSecondary)
                    this.setCurrentlyPlaying();

            };

            this.createItem = function(i) {
                var thumb, img, $item;

                img = getImage(this.type, this.data, i);

                //preloadImgs.push(img);

                //TODO: Am I ever going to use this id value? Can eliminate a ton of dom manips in add item to element) below if i get rid of it

                thumb = {
                    type:'thumb-list-item',
                    title: this.data[i].name,
                    id: cssSelector.thumbList.substr(1) + '-' + i,
                    img: (img) ? "<img src='" + img + "' alt='image'/>" : ''
                };

                $item = self.$templates.tmpl(thumb).data('index', i);

                if (img !== false) {
                    TTWUtils.preloadImages([img], function() {
                        $item.find('img').animate({'opacity' : 1}, 'fast');
                    });
                } //TODO: Load these all at once?

                return $item;

            };

            this.advance = function() {

                var $activeTile = $(cssSelector.thumbList + '-' + self.current).css(cssSelector.itemPlayingClass);

                this.setCurrentlyPlaying();
                //this.$element.animate({'left':- ( $activeTile.position().left ) }, 'slow');
                //this.scrollableElement.scrollTo({x:$activeTile.position().left});
            };

            this.add = function(data, index) {
                var thumb, $thumb,  $currentlyAtIndex, $elementsToRenumber, $thumbList, renumberFrom, id;

                //create the thumb, set opacity to 0 so we can fade it in later
                $thumb = this.createItem(index).css('opacity', 0);

                //ad the new thumb to the list
                addItemToElement(this, $thumb, cssSelector.thumbListItemClass, cssSelector.thumbList.substr(1), index);

                //set the new width of the inner element
                this.setInnerWidth();

                //fade in the new element
                $thumb.animate({opacity:1}, 'fast');

                this.scrollableElement.update();

            };

            this.remove = function(index) {
                this.$element.find(cssSelector.thumbListItemClass).eq(index).fadeOut().remove();

                renumberElements(this, cssSelector.thumbListItemClass, index, cssSelector.thumbList.substr(1));

                this.setInnerWidth();

                this.scrollableElement.update();
            };

            this.setInnerWidth = function() {
                //update the width of the thumbListInner
                //set the width of the inner thumb list to the product of (num items * width of on thumb item)
                //necessary for scrollbar func.
                this.$element.find(cssSelector.thumbListInnerClass).width(this.itemWidth * this.data.length);

            };

            this.resize = function(){
                this.setInnerWidth();
                this.scrollableElement.update();
            };

        };

        ThumbList.prototype = new Widget();

        List = function() {

            this.type = 'List';

            this.init = function(anchor, options) {

                var thisInstance = startWidget(this, anchor, options);

                if (!thisInstance)
                    return false;

                //NOTE: THIS SCROLLBAR SCRIPT IS VERY DEPENDANT ON THE CSS. BE CAREFUL WHEN MAKING CHANGES
                this.scrollableElement = $('#' + this.id);

                this.scrollableElement.tinyscrollbar({axis:'y'});

                //set up event handler
                this.applyItemClickEvent();
            };

            this.render = function() {
                var idPrefix, classPrefix, $list, last, newListItem, oddOrEven;
                //create teh list wrapper
                $list = self.$templates.tmpl({type:'list', id:cssSelector.list});

                idPrefix = cssSelector.listItemId.substr(1);
                classPrefix = cssSelector.listItemClass.substr(1);

                //create a list item for each item in the playlist
                for (var i = 0,len = this.data.length; i < len; i++) {

                    $list.find(cssSelector.List.wrapper).append(this.createItem(i, idPrefix, classPrefix));
                }

                //add the list to the dom
                $(this.anchor).append($list);

                this.$element = $list;
            };

            this.createItem = function(index, idPrefix, classPrefix) {
                var last, oddOrEven, newListItem;

                //set the idPrefix and classPrefix if they are undefined
                idPrefix = (typeof idPrefix != 'undefined') ? idPrefix : cssSelector.listItemId.substr(1);
                classPrefix = (typeof classPrefix != 'undefined') ? classPrefix : cssSelector.listItemClass.substr(1);

                //determine if this is the last item in the list
                last = (index === this.data.length - 1) ? cssSelector.listItemLastClass.substr(1) : '';

                //determine odd or even class, using +1 because list index starts at 0, which is even but humans count from 1
                oddOrEven = ((index + 1) % 2 === 0) ? 'even' : 'odd';

                //set variables for new item
                newListItem = {
                    type: 'list-item',
                    itemClass:classPrefix + ' ' + oddOrEven + ' ' + last,
                    id:idPrefix + index,
                    name: this.data[index].name
                };

                return self.$templates.tmpl(newListItem).data('index', index);

            };

            this.advance = function() {
            };

            this.add = function(data, index) {
                var $listItem, $currentlyAtIndex, $elementsToRenumber, $list, renumberFrom, id;

                //TODO: Am I ever going to use this index value? Can eliminate a ton of dom manips below if i get rid of it
                id = cssSelector.listItemId.substr(1);

                $listItem = this.createItem(index);

                addItemToElement(this, $listItem, cssSelector.listItemClass, id, index);

            };

            this.remove = function(index) {
                this.$element.find(cssSelector.listItemClass).eq(index).fadeOut().remove();

                renumberElements(this, cssSelector.listItemClass, index, cssSelector.list.substr(1));

            };

        };

        List.prototype = new Widget();

        AdvancedList = function() {

            this.type = 'AdvancedList';
            this.grid = {};
            //TODO: Make sure changing the order in a different interface element reflects properly in the advanced List
            this.init = function(anchor, options) {

                var thisInstance;

                thisInstance = startWidget(this, anchor, options);

                //evnet handlers are set in grid setup and use slick grids internal events
            };

            this.render = function() {
                var $anchor, options, columns, currentSortCol, isAsc, i, data, thisInstance;

                $anchor = $(this.anchor);

                columns = [
                    {id: "#",
                        name: "",
                        width:40,
                        behavior: "selectAndMove",
                        selectable: false,
                        resizable: false,
                        cssClass: "cell-reorder dnd"
                    },
                    {id:"title", name:"Title", field:"name", sortable:true},
                    {id:"artist", name:"Artist", field:"artist", sortable:true},
                    {id:"album", name:"Album", field:"album", sortable:true},
                    {id:"play_length", name:"Duration", width:10, field:"play_length", sortable:true}

                ];

                data = this.data;

                options = {
                    enableCellNavigation: true,
                    enableColumnReorder: false,
                    forceFitColumns:true
                };

                $.extend(true, options, this.options);

                currentSortCol = { id: "title" };

                isAsc = true;

                this.$element = self.$templates.tmpl({type:'advanced-list'}).appendTo(this.anchor).height($anchor.height()).width($anchor.width());

                this.grid = new Slick.Grid(this.anchor + ' ' + cssSelector.advancedList, this.data, columns, options);

                this.gridSetup();
            };

            this.gridSetup = function() {
                var grid,  currentSortCol, thisInstance, data,
                        sortBy = "",   sortAsc, plSort, isAsc;  // a field name -- global var for now

                thisInstance = this;

                data = this.data;

                grid = this.grid;

                //Handle grid sorts
                plSort = function(a, b) {      // two objects

                    if (!sortAsc) {
                        var t = a;
                        a = b;
                        b = t; // swap the parms
                    }

                    if (typeof a[sortBy] == "number") { // when sorting by a numeric field
                        if (a[sortBy] < b[sortBy]) return -1;
                        if (a[sortBy] > b[sortBy]) return 1;
                        return 0;
                    }
                    else {  // assume sort field is a String
                        if (a[sortBy].toLowerCase() < b[sortBy].toLowerCase()) return -1;
                        if (a[sortBy].toLowerCase() > b[sortBy].toLowerCase()) return 1;
                        return 0;
                    }
                };

                grid.onSort.subscribe(function(e, args) {
                    currentSortCol = args.sortCol;
                    sortBy = args.sortCol.field;  // set the sort key
                    data.sort(plSort);
                    sortAsc = isAsc = args.sortAsc;
                    grid.invalidateAllRows();
                    grid.render();
                    if (!thisInstance.isSecondary)
                        self.eventManager.publish('mbListUpdated');
                });

                //Handle re-ording of grid rows
                var moveRowsPlugin = new Slick.RowMoveManager();

                grid.setSelectionModel(new Slick.RowSelectionModel());

                moveRowsPlugin.onBeforeMoveRows.subscribe(function(e, data) {
                    for (var i = 0; i < data.rows.length; i++) {
                        // no point in moving before or after itself
                        if (data.rows[i] == data.insertBefore || data.rows[i] == data.insertBefore - 1) {
                            e.stopPropagation();
                            return false;
                        }
                    }

                    return true;
                });

                moveRowsPlugin.onMoveRows.subscribe(function(e, args) {
                    var extractedRows = [], left, right;
                    var rows = args.rows;
                    var insertBefore = args.insertBefore;

                    left = data.slice(0, insertBefore);
                    right = data.slice(insertBefore, data.length);

                    for (var i = 0; i < rows.length; i++) {
                        extractedRows.push(data[rows[i]]);
                    }

                    rows.sort().reverse();

                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i];
                        if (row < insertBefore)
                            left.splice(row, 1);
                        else
                            right.splice(row - insertBefore, 1);
                    }

                    data = left.concat(extractedRows.concat(right));

                    var selectedRows = [];
                    for (var i = 0; i < rows.length; i++)
                        selectedRows.push(left.length + i);

                    grid.resetActiveCell();
                    grid.setData(data);
                    grid.setSelectedRows(selectedRows);
                    grid.render();


                    if (!thisInstance.isSecondary) {
                        //Let the rest of the application know that an item was moved
                        //We don't want primary widgets to be updated because of an event on a secondary widget
                        self.eventManager.publish('mbInitPlaylistMove', {old_index:args.rows[0], new_index:args.insertBefore - 1});
                    }


                });

                grid.registerPlugin(moveRowsPlugin);

                grid.onClick.subscribe(function(e) {

                    var cell = grid.getCellFromEvent(e);

                    thisInstance.itemOnClick(e, self.activeElements[thisInstance.anchor], cell.row);
                });
            };

        };

        AdvancedList.prototype = new Widget();

        AlbumCover = function() {
            //TODO: Allow option to specify size
            this.type = 'AlbumCover';

            this.init = function(anchor, options) {

                var thisInstance = startWidget(this, anchor, options);

                if (!thisInstance)
                    return false;

                this.advance();

                this.resize();

                this.applyDefaultResizeEvent();

                this.$element.animate({opacity:1}, 'slow');
            };

            this.render = function() {
                var albumCoverId, albumCoverVars, $albumCover;

                albumCoverId = cssSelector.albumCover + '-' + self.current;

                //substr(1) the id to remove # before it is set
                albumCoverVars = {
                    type:'album-cover',
                    id: albumCoverId.substr(1),
                    img:''
                };
                this.$element = $albumCover = self.$templates.tmpl(albumCoverVars);

                $albumCover.appendTo(this.anchor);
            };

            this.advance = function() {
                //TODO: Have some kind of maintain ratio option for images that don't scale
                var img, $albumCover, thisInstance = this;

                $albumCover = this.$element;

                //fade out current album cover, get new one, fade in when its loaded
                $albumCover.animate({'opacity' : 0}, 'fast', function() {
                    if (img = getImage(thisInstance.type, thisInstance.data)) {//TODO: css selector
                        $albumCover.find('.mb-album-cover-img').html(self.$templates.tmpl({type:'album-cover-img', img:img}));

                        TTWUtils.preloadImages([img], function() {
                            $albumCover.animate({'opacity' : 1}, 'fast');
                        });

                    }
                });
            };

            this.resize = function() {
                var anchorHeight, anchorWidth, size, $albumCover, $anchor;

                $albumCover = this.$element;
                $anchor = $albumCover.parent();

                //set the size of the album cover (based on the size of its container)
                anchorWidth = $anchor.width();
                anchorHeight = $anchor.height();
                size = (anchorWidth <= anchorHeight) ? anchorWidth : anchorHeight; //set size = to the smaller of height and width
                $albumCover.height(size).width(size).find(cssSelector.albumCoverHighlightClass).height(size - 2).width(size - 2);
            };

        };

        AlbumCover.prototype = new Widget();

        Description = function() {

            this.type = 'Description';

            this.descriptionValues = {};

            this.init = function(anchor, options) {

                var thisInstance = startWidget(this, anchor, options);

                if (this.options.autoSize) {
                    this.resize();
                    this.applyDefaultResizeEvent();
                }

            };

            this.render = function() {
                var $description, thisInstance;

                thisInstance = this;

                this.descriptionValues = this.getDescriptions();

                $description = self.$templates.tmpl({type:'description'});

                var descriptionElements = this.options.order.split(',');

                $.each(descriptionElements, function(i, descElem) {
                    descElem = $.trim(descElem);

                    var descriptionVars = {
                        type:'description-' + descElem,
                        value: thisInstance.descriptionValues[descElem]
                    };

                    $description.append(self.$templates.tmpl(descriptionVars));

                });

                this.$element = $description.appendTo(this.anchor);

                if (!this.options.autoSize)
                    this.applyFontSizes();//this.$element.css('font-size', this.options.fontSize);
            };

            this.advance = function() {
                //TODO: Add classes to css selector object
                var $description = this.$element,
                        selectors = cssSelector.Description;

                this.descriptionValues = this.getDescriptions();

                $description.find(selectors.titleSelector).html(this.descriptionValues.title);
                $description.find(selectors.artistSelector).html(this.descriptionValues.artist);
                $description.find(selectors.albumSelector).html(this.descriptionValues.album);

                //only call resize if the font size isn't explicitly set
                if (!this.options.fontSize)
                    this.resize();

            };

            this.resize = function() {
                var selectors = cssSelector.Description;

                var $description = this.$element;

                TTWUtils.textFit($description.find(selectors.titleSelector).html(this.descriptionValues.title));
                TTWUtils.textFit($description.find(selectors.artistSelector).html(this.descriptionValues.artist));
                TTWUtils.textFit($description.find(selectors.albumSelector).html(this.descriptionValues.album));
            };

            this.getDescriptions = function() {
                var currentMedia = this.data[self.current];

                return {
                    title : (typeof currentMedia.name != 'undefined') ? currentMedia.name : '',
                    album : (typeof currentMedia.album != 'undefined') ? currentMedia.album : '',
                    artist : (typeof currentMedia.artist != 'undefined') ? currentMedia.artist : ''
                };
            };

            this.applyFontSizes = function() {

                var thisInstance = this;

                $.each(this.descriptionValues, function(descItem, value){
                    var descItemSize = thisInstance.options[descItem + 'FontSize'],
                              $descItem = thisInstance.$element.find(cssSelector.Description[descItem + 'Selector']);

                    if (descItemSize) {
                        //if there is a size size for this specific element, use it
                        $descItem.css('font-size', descItemSize);
                    }
                    else if (thisInstance.options.fontSize) {
                        //otherwise use the default fontSize if it is available
                        $descItem.css('font-size', thisInstance.options.fontSize);
                    }
                });
            };

        };

        Description.prototype = new Widget();

        BackgroundImage = function() {

            this.type = 'BackgroundImage';

            this.init = function(anchor, options) {

                var thisInstance = startWidget(this, anchor, options);

                if (!thisInstance)
                    return false;

                this.advance();

                this.applyDefaultResizeEvent();
            };

            this.render = function() {
                this.$element = self.$templates.tmpl({type:'background-image'}).appendTo(this.anchor);
            };

            this.advance = function() {

                var background = this.$element, backgroundUrl, thisInstance = this;
//TODO: class should come from cssSelector
                var prev = background.find(cssSelector.backgroundImageImg);

                //If there is an existing background image, fade it out before adding the new one. Otherwise just add the img
                if (prev.length) {
                    prev.animate({opacity: 0}, 'fast', function() {
                        $(this).remove();
                        thisInstance.addBackgroundImage(background, backgroundUrl);
                    });
                }
                else {
                    thisInstance.addBackgroundImage(background, backgroundUrl);
                }


            };

            this.addBackgroundImage = function(background, backgroundUrl) {
                var thisInstance = this;
                if (backgroundUrl = getImage(this.type, this.data)) {
//                    var img = $("<img>").attr({'id':'temp-image','class': 'background-image'}).css('opacity', 0);
//
//                    img.bind('load', function() {
//                        backgroundImage.resize();
//                        //this.adjustBG(img);
//                        background.append(img);
//
//                        background.find('.background-image').css({opacity: 1});
//                    }).attr({'src': backgroundUrl}); // add the source attr after binding the load event otherwise FF will throw an error "too much recursion"
                    TTWUtils.preloadImages([backgroundUrl], function() { // use commented code above or set the src attriblute after/ wait, thats already happening in my preload function.....
                        var img = $("<img>").attr({'class': cssSelector.backgroundImageImg.substr(1), 'src': backgroundUrl});
                        background.append(img);
                        thisInstance.resize();

                        background.find(cssSelector.backgroundImageImg).css({opacity: 1});
                    });
                }
            };

            this.adjustBG = function (img) {

                var imgRatio = img.width() / img.height();

                var bgWidth = $(this.anchor).width(),
                        bgHeight = bgWidth / imgRatio;

                if (bgHeight < $(window).height()) {
                    bgHeight = $(window).height();
                    bgWidth = bgHeight * imgRatio;
                }

                img.width(bgWidth).height(bgHeight);
            };

            this.resize = function() {
                var $background = this.$element,
                        height = this.$anchor.height(),
                        img = $background.find('img');

                $background.height(height);

                if(img.length)
                    this.adjustBG(img);
            };

        };

        BackgroundImage.prototype = new Widget();

        ThumbWall = function() {
            this.size = 0;
            this.type = 'ThumbWall';

            this.init = function(anchor, options) {

                var thisInstance = startWidget(this, anchor, options);

                if (!thisInstance)
                    return false;

                //NOTE: THIS SCROLLBAR SCRIPT IS VERY DEPENDANT ON THE CSS. BE CAREFUL WHEN MAKING CHANGES
                this.scrollableElement = $('#' + this.id);

                this.scrollableElement.tinyscrollbar({axis:'y'});

                this.applyDefaultResizeEvent();

                this.applyItemClickEvent();

            };

            this.render = function() {

                var     idPrefix = cssSelector.thumbWallItemId.substr(1),
                        itemClass = cssSelector.thumbWallItemClass.substr(1),
                        $thumbWall,
                        $thumbWallInner,
                        thumbSize;

                thumbSize = this.getThumbSize(true);

                $thumbWall = self.$templates.tmpl({type:'thumb-wall', id:cssSelector.thumbWall});//.height(this.$anchor.height());

                $thumbWallInner = $thumbWall.find('.mb-thumb-wall');

                if (thumbSize) {
                    for (var i = 0,len = this.data.length; i < len; i++) {

                        $thumbWallInner.append(this.createItem(i, thumbSize, idPrefix, itemClass));
                    }
                }

                $(this.anchor).append($thumbWall);

                this.$element = $thumbWall;
            };

            this.createItem = function (index, size, idPrefix, itemClass) {

                var options, img, $item;

                //get thumb wall options
                options = self.options.interfaceMgr.widgets.ThumbWall;

                //get the image associated with this media file
                img = getImage(this.type, this.data, index);

                //set class and id prefix if they arent set
                itemClass = (typeof itemClass != 'undefined') ? itemClass : cssSelector.thumbWallItemClass.substr(1);
                idPrefix = (typeof idPrefix != 'undefined') ? idPrefix : cssSelector.thumbWallItemId.substr(1);

                //set parameters for the new thumb wall item
                var newThumbWallItem = {
                    type: 'thumb-wall-item',
                    itemClass:itemClass, //TODO: Move all class declarations to template file
                    id:idPrefix + '-' + index,
                    img: img,
                    name: this.data[index].name,
                    size: size.size,
                    innerSize: size.size,
                    space: size.space,
                    color: options.color

                };

                //create the item using template
                $item = self.$templates.tmpl(newThumbWallItem).data('index', index);

                //fade in the image when it is finished loading
                if (img !== false) {
                    TTWUtils.preloadImages([img], function() {
                        $item.find('img').animate({'opacity' : 1}, 'fast');
                    });
                }

                return $item;
            };

            this.advance = function() {

            };

            this.resize = function() {
                var options, $thumbWall, $anchor, size;

                $thumbWall = this.$element;
                $anchor = $thumbWall.parent();

                size = this.getThumbSize();

                $thumbWall.find(cssSelector.thumbWallItemClass).height(size.size).width(size.size).css('margin', size.space).find(cssSelector.thumbWallItemInnerClass).height(size.size - 2);

                this.scrollableElement.update();
            };

            this.add = function(data, index) {
                var $thumb, size, options, $anchor = this.$element.parent();

                //get thumbwall options
                options = self.options.interfaceMgr.widgets.ThumbWall;

                //get the thumb wall item size
                size = getTileSize($anchor, options.thumbSpace, options.numThumbs, this.data.length);

                //create the thumb wall item
                $thumb = this.createItem(index, size);

                //add the item to the thumb wall
                addItemToElement(this, $thumb, cssSelector.thumbWallItemClass, cssSelector.thumbWallItemId.substr(1), index);

                this.scrollableElement.update();
            };

            this.remove = function(index) {

                this.$element.find(cssSelector.thumbWallItemClass).eq(index).fadeOut().remove();

                renumberElements(this, cssSelector.thumbWallItemClass, index, cssSelector.thumbWallItemId.substr(1));

                this.scrollableElement.update();
            };

            this.getThumbSize = function(init){
                var thumbSize;

                if(this.options.autoSize)
                    thumbSize = getTileSize($(this.anchor), this.options.thumbSpace, this.options.numThumbs, this.data.length, init);
                else thumbSize = {size:this.options.thumbSize, space:this.options.thumbMargin};

                return thumbSize;
            };
        };

        ThumbWall.prototype = new Widget();

        Folders = function() {

            var styles = {
                normal:'normal',
                simple:'simple',
                switcher:'switcher'
            },

            style = styles.normal,

            switcherCurrent= 0;

            this.type = 'Folders';

            this.size = 0;

            this.useBackButton = true;

            this.additionalViews = '';

            this.openFolderOptions = {};

            this.currentFolder = 0;

            this.switcherRendered = false;

            this.init = function(anchor, options) {
                var thisInstance = this,  initVars;

                this.data = options.data;

                initVars = {
                    anchor:anchor,
                    data:this.data
                };

                //The folder widget needs to be responsible for getting its own meta data since the this.data structure is different
                if (self.options.ID3.getID3) {

                    //keep track of the relationship between folders and events(calls to meta). One call per folder
                    //Keep track of the number of folders that have had their metadata retrieved
                    var eventFolderMap = {}, eventIds = '', numFoldersMetaRetrieved = 0, numFoldersMetaNeeded = 0;

                    //loop through each folder and get the metadata
                    $.each(this.data, function(i, folder) {
                        if (!metadataRetrieved(folder.contents)) {
                            var eventId = self.getMetadata(folder.contents);

                            //keep track of the specific call to the meta function that corrosponds to each folder
                            eventFolderMap[eventId] = i;

                            //keep track of the number of folders that need meta data retrieved (since javascript objects dont have length property)
                            numFoldersMetaNeeded++;

                            //create a string of event ids that need to be subscribed to, so subscribe is only called once
                            eventIds = eventIds + ' ' + eventId;
                        }

                    });

                    if (numFoldersMetaNeeded > 0) {
                        //process the metadata for each folder when it is retrieved
                        self.eventManager.subscribe($.trim(eventIds), function(e) {

                            numFoldersMetaRetrieved++;
                            //e.type = the eventId created by the getMetadata function

                            var meta = self.eventManager.getData(e.type);

                            //merge the metadata into the folder data
                            $.extend(true, thisInstance.data[eventFolderMap[e.type]].contents, meta);

                            //if all the folders have had their metadata retrieved, finish init
                            if (numFoldersMetaRetrieved == numFoldersMetaNeeded) {
                                thisInstance.finishInit(initVars, options);
                            }
                        });
                    }
                    else {
                        //if the id3 option is on, but all folders already have their metadata, just finish the init
                        this.finishInit(initVars, options);
                    }
                }
                else this.finishInit(initVars, options);

            };

            this.finishInit = function(initVars, options) {
                //In a separate function to prevent having to duplicate code in init function
                // (subscribe metaEventId and else branch)

                var thisInstance, events;

                options.isSecondary = true; //!IMPORTANT. Folders should always be secondary
                options.data = initVars.data;

                thisInstance = startWidget(this, initVars.anchor, options);

                this.useBackButton = this.usingBackButton();

                this.additionalViews = this.getAdditionalViews();

                events = {
                    click:this.folderOnClick
                };

                this.bindEvents(events, this.itemSelector(), true);

                this.$element.animate({'opacity':1}, 'fast');
            };

            this.render = function() {

                style = this.getStyle();

                this.$element = self.$templates.tmpl({type:'folders'}).css({opacity:0});

                if(style == styles.normal || style == styles.simple){
                    this.renderSimpleNormal();
                }
                else{
                    this.renderSwitcher();
                }

                $(this.anchor).append(this.$element);

            };

            this.renderSimpleNormal = function() {

                var thisInstance = this;


                if (this.options.style == styles.normal) {
                    this.getFolderSize(true);
                }



                $.each(this.data, function(i, folder) {
                    thisInstance.$element.append(thisInstance.createFolder(folder, i));
                });

                  if(style == styles.normal)
                    this.applyDefaultResizeEvent();
            };

            this.renderSwitcher = function() {
                var thisInstance = this, event, switcher;

                //if the switcher hasn't been renedered, create it. If it has get a reference to it
                if(!this.switcherRendered){
                    switcher = self.$templates.tmpl({type:'folder-switcher'});
                }
                else switcher = this.$element.find(cssSelector.Folders.switcher);

                //set the sie for the switcher
                this.setSwitcherSize(switcher);

                //create the html for the current folder
                switcher.find(cssSelector.Folders.switcherViewport).append(this.createFolder(this.data[switcherCurrent], switcherCurrent));

                this.$element.append(switcher);

                //only bind the back k buttons once
                 if(!this.switcherRendered){
                     this.bindSwitcherButtons();
                 }

                this.switcherRendered = true;
                event = {
                    resize: function(){
                        thisInstance.setSwitcherSize(switcher);
                    }
                };

                this.bindEvents(event, window);
            };

            this.createFolder = function(folder, index) {
               
                var img = folder.background || false;

                if(style == styles.simple)
                    folder = self.$templates.tmpl({type:'simple-folder', name:folder.name});
                else folder = self.$templates.tmpl({type:'folder', name:folder.name,  img:img,size:this.size.size, space:this.size.space, color:this.options.color});


                //add the index to the folder element to help handle click events
                folder.data({
                    'index': index,
                    'foldersAnchor':this.anchor
                });

                 if (img !== false) {
                    TTWUtils.preloadImages([img], function() {
                        folder.find('img').animate({'opacity' : 1}, 'fast');
                    });
                }

                return folder;
            };

            this.resize = function() {
                this.getFolderSize();

                $(this.itemSelector()).height(this.size.size).width(this.size.size).css('margin', this.size.space);
            };

            this.folderOnClick = function(e) {
                //think in the context of an individual folder
                //'this' keyword corresponds to the folder being clicked not the folders widget
                var $this, thisFolderWidget, folder, folderData;

                $this = $(this);

                thisFolderWidget = self.activeElements[$this.data('foldersAnchor')].instance;

                //TODO: Look at secondaryData vs data on thisFolderWidget. When each is getting set and what they hold. May be able to refactor this method.
                thisFolderWidget.currentFolder = $this.data('index');

                folder = thisFolderWidget.data[thisFolderWidget.currentFolder];

                thisFolderWidget.openFolder(folder);
            };

            this.openFolder = function(folder, widget){
                //'open' the folder by loading the specified widget with the data for that folder
                var openFolderWidget, folderData, defaultOpenFolderOptions;

                folderData = folder.contents;

                widget = widget || this.options.widgetToLoad;

                //Settings for the widget that is loaded when the folder is opened
                defaultOpenFolderOptions = {
                    anchor:this.getOpenFolderAnchor(),
                    widgetName: widget,
                    isSecondary:true,
                    data:folderData,
                    markupToInsert: this.getOpenFolderMarkup(),
                    insertPosition:'prepend'
                };

                this.openFolderOptions = $.extend(true, {}, defaultOpenFolderOptions, this.options.openFolderOptions);

                //replaces the folders widget with the widget specified, attaches the back button markup, plus user defined markup
                openFolderWidget = addWidget(this.openFolderOptions);

                if (this.useBackButton)
                    this.bindBackButton(openFolderWidget);

                self.runCallback(this.options.openFolderCallback, openFolderWidget, folder);
            };

            this.getUserMarkupForOpenFolder = function(){
                //This is necessary so that an undefined value isn't passed to add, which was causing problems
                return (typeof this.options.openFolderMarkupToInsert != 'undefined') ? this.options.openFolderMarkupToInsert : '';
            };

            this.getOpenFolderMarkup = function(){
                var markup = false;

                //if the folder is being opened on the same anchor, we need a back button
                if(this.useBackButton){
                    markup =  self.$templates.tmpl({type:'folder-back-button'}).add(this.getUserMarkupForOpenFolder());
                }

                //if additional views are specified, we need markup for each
                if (this.additionalViews) {
                    if (markup)
                        markup = markup.add(this.getMarkupForAdditionalViews());
                    else markup = this.getMarkupForAdditionalViews();
                }

                //add any user defined markup
                if (markup) {
                    markup = markup.add(this.getUserMarkupForOpenFolder());
                }
                else markup = this.getUserMarkupForOpenFolder();

                return markup;
            };

            this.getOpenFolderAnchor = function(){
                //if there is not a separate anchor defined for the open folder, use the anchor for the folders
                return (!this.options.openFolderAnchor) ? this.anchor : this.options.openFolderAnchor;
            };

            this.bindBackButton = function(currWidget){
                var thisInstance = this, backButtonAction;

                //if there is a back button callback specified, use it, otherwise use the default action
                backButtonAction = $.isFunction(this.options.backButtonAction) ? this.options.backButtonAction : this.defaultBackButtonAction;

                //using both the back button class and the widget markup class to make sure this is bound specifically to the back button for this instance
                currWidget.$anchor.find(currWidget.markupClass() + ' ' + cssSelector.Folders.folderBackButton).bind('click', function(){
                    backButtonAction(thisInstance, currWidget);
                });
            };

            this.defaultBackButtonAction = function(thisInstance) {
              //When the back button is clicked re-open the folders widget, with the same options that were used to create it
                addWidget(thisInstance.options);
                self.runCallback(thisInstance.options.backButtonCallback, thisInstance);
            };

            this.usingBackButton = function() {
                //use the back button if explicitly specified by the user or if the open folder anchor is the same as the folder anchor
                return (this.options.useBackButton || (this.getOpenFolderAnchor() == this.options.anchor));
            };

            this.getAdditionalViews = function(){
                var suppliedViews = false,
                        additionalViews = [],
                    validViews = [widgetNames.thumbList, widgetNames.list, widgetNames.advancedList, widgetNames.thumbWall];

                if(this.options.openFolderAdditionalViews){
                    suppliedViews = this.options.openFolderAdditionalViews.split(',');

                    $.each(suppliedViews, function(i, value){
                        value = $.trim(value);

                        if($.inArray(value, validViews))
                            additionalViews.push(value);
                    });
                }

                return additionalViews.length ? additionalViews : false;
            };

            this.getMarkupForAdditionalViews = function(){
                var thisInstance = this,
                        markup = self.$templates.tmpl({type:'folder-additional-views'});

                $.each(this.additionalViews, function(i, view){
                    var viewMarkup = self.$templates.tmpl({type:'folder-additional-view', viewName:view});

                    viewMarkup = thisInstance.bindAdditionalViewEvents(viewMarkup, view);

                    markup.append(viewMarkup);
                });

                return markup;
            };

            this.bindAdditionalViewEvents = function(markup, view){
                var thisInstance = this;

                markup.click(function(){
                    //replaces the currently displayed widget for the this folder, with the new widget(view)
                    thisInstance.openFolder(thisInstance.data[thisInstance.currentFolder], view);
                });

                return markup;
            };

            this.getStyle = function(){
                //if the style is set on options and it exists in the styles object (valid value), otherwise use default
                return (typeof this.options.style != 'undefined' && styles[this.options.style]) ? this.options.style : style;
            };

            this.bindSwitcherButtons = function() {
                var idPrefix = '#' + this.id + ' ',
                        thisInstance = this;

                this.$element.find(cssSelector.Folders.switcherNext).click(function() {
                    switcherCurrent = (switcherCurrent++ < thisInstance.data.length - 1 ) ? switcherCurrent : 0;
                    thisInstance.changeFolder();
                });

               this.$element.find(cssSelector.Folders.switcherPrev).click(function() {

                    switcherCurrent--;
                    if(switcherCurrent < 0)
                        switcherCurrent = thisInstance.data.length - 1;

                    thisInstance.changeFolder();
                });
            };

            this.changeFolder = function(){
                var thisInstance = this, viewport;

                viewport = this.$element.find(cssSelector.Folders.switcherViewport);

                viewport.animate({opacity:0}, 'fast', function() {
                    $(this).html('');

                    //render the new folder
                    thisInstance.renderSwitcher();

                    //fade in the new folder
                    viewport.animate({'opacity':1}, 'fast');
                });


            };

            this.getSwitcherSize = function(){
                var height, width, size;
                height = this.$anchor.height();
                width =  this.$anchor.width();
                size = (height < width) ? height : width;

                return {containerWidth:size * 1.25, containerHeight:height, viewport:size, size:size * .8, space:size * .1};
            };

            this.setSwitcherSize = function(switcher){
                                this.size = this.getSwitcherSize();

                switcher.height(this.size.containerHeight).width(this.size.containerWidth)
                        .find(cssSelector.Folders.switcherViewport).height(this.size.viewport).width(this.size.viewport)
                        .find(cssSelector.Folders.itemClass).height(this.size.size).width(this.size.size).css('margin', this.size.space);
            };

            this.getFolderSize = function(init) {
                if (this.options.autoSize) {
                    this.size = getTileSize($(this.anchor), this.options.folderSpace, this.options.numFolders, this.data.length, true);
                }
                else {
                    this.size = {size:this.options.folderSize, space:this.options.folderMargin};
                }
            };

        };

        Folders.prototype = new Widget();

        Video = function(){
            /** This widget is different from other widgets in that:
             * 1. It has no data source. Its purpose is merely to show/hide the jPlayer video player (the jPlayer DOM element)
             * 2. There is no point in ever creating multiples. This widget is tied directly to the jPlayer div.
             * If you did create multiples, they would all refer to the same thing
             * 3. Regardless of the anchor assigned in the widget options, the DOM element for the video player will be a
             * child of the DOM element jPlayer was instanced on. This is because you can not move the jPlayer dom element
             * after the jPlayer ready event, without causing issues with the flash player. There is no way to reliably
             * move the element before the ready event.
             *
             * NOTE: The reason this widget is tied directly to the jPlayer div is because that is where the video is
             * played. There is currently no jPlayer option to change this behavior**/
            this.type = 'Video';
            this.$player = {};
            this.width = 0;
            this.height = 0;

            this.init = function(anchor, options){
                var thisInstance = this;

                this.$player = $(cssSelector.Video.wrapper);

                this.setOptions(options);

                this.setSize(this.options.width, this.options.height);//call set size. Set size calls set option. Set option decides its a video option. Set option notifies player.

                this.pseudoAnchor();

                self.eventManager.subscribe('mbVideoLoad', function(){
                    thisInstance.show();
                });

                self.eventManager.subscribe('mbVideoEnd', function(){
                    thisInstance.hide();
                });

                //TODO: SHould I just call startWidget for this widget even though its only purpose would be to call this
                notifyWidgetLoaded(this);

            };

            this.show = function(){
                var thisInstance = this;

                this.$player.css('opacity',0)
                        .addClass(getClass(cssSelector.Video.show))
                        .removeClass(getClass(cssSelector.Video.hide));

                //make sure the markup is in the correct position BEFORE fading in the video
                this.manageVideoMarkup();

                this.$player.animate({opacity:1}, 400, function(){
                            self.eventManager.publish('mbVideoShow');

                            self.runCallback(thisInstance.options.showCallback, thisInstance);
                        });
            };

            this.hide = function(){
                var thisInstance = this;

                this.$player.animate({'opacity': 0}, 'fast', function(){

                    thisInstance.$player.removeClass(getClass(cssSelector.Video.show)).addClass(getClass(cssSelector.Video.hide));

                    //thisInstance.$player.find(self.cssSelector.jPlayer).removeAttr('style');

                    self.runCallback(thisInstance.options.hideCallback, thisInstance);

                    self.eventManager.publish('mbVideoHide');
                });
            };

            this.manageVideoMarkup = function(){
                if(this.options.manageVideoMarkup){
                    var  left, top, $videoPlay;

                    $videoPlay = this.$player.find(cssSelector.Video.videoPlay);

                    left = (this.$player.width()/2) - ($videoPlay.width()/2);
                    top =(this.$player.height()/2) - ($videoPlay.height()/2);

                    //center the video play button
                    $videoPlay.css({left:left, top:top});
                }
            };

            this.pseudoAnchor = function(){
                if(this.options.pseudoAnchor && this.options.anchor){
                    this.$anchor = $(this.options.anchor);

                    if(!this.$anchor.length)
                        $.error('Invalid pseudo anchor for video widget (' + this.options.anchor + ')');

                    this.resize();

                    this.applyDefaultResizeEvent();
                }
            };

            this.resize = function() {
                var position = this.$anchor.offset(),
                        height = this.$anchor.height(),
                        width = this.$anchor.width();

                this.$player.css({position:'absolute', left:position.left, top:position.top});

                this.setSize(width, height);
            };

            this.setSize = function(width, height){
                this.width = width;
                this.height = height;

                this.$player.css({width:width, height:height});

                self.setOption('player', 'size', {width:width, height:height});

                this.manageVideoMarkup();
            };
        };

        Video.prototype = new Widget();

        interfaceApi = {
            init:init,
            addWidget:addWidget,
            removeWidget:removeWidget,
            getWidget:getWidget,
            validWidgets:validWidgets, //TODO:Why is this being returned?
            ThumbList:ThumbList,
            List:List,
            AdvancedList:AdvancedList,
            AlbumCover:AlbumCover,
            Description: Description,
            BackgroundImage:BackgroundImage,
            ThumbWall:ThumbWall,
            Folders:Folders,
            Video:Video

        };

        return interfaceApi;
    };

    ttwMediaBox.prototype.load = function() {
        var self = this;


        function loadTemplates() {
             $.ajax({
                url: self.options.templates.main,

                success: function(data) {
                    self.$templates = $(data);
                    self.eventManager.publish('mbComponentsLoaded');
                },
                error: function(xhr, text, error) {
                    self.debugMessage('Error retrieving templates (' + text + ' - ' + error + ')');
                }
            });
        }


        loadTemplates();
    };

    var TTWUtils = {
        preloadImages: function (imageList, callback) {
            var i, total, loaded = 0, images = [];
            if (typeof imageList != 'undefined') {
                if ($.isArray(imageList)) {
                    total = imageList.length; // used later
                    for (var i = 0; i < total; i++) {
                        images[imageList[i]] = new Image();
                        images[imageList[i]].onload = function() {
                            loaded++;
                            if (loaded == total) {
                                if ($.isFunction(callback)) {
                                    callback();
                                }
                            }
                        };
                        images[imageList[i]].src = imageList[i];
                    }
                }
            }
        },
        //Adapted from Adam Mathes at http://forrst.com/posts/jquery_plugin_to_resize_text_to_fit_a_specific_w-1L3
        //Fits text to height
        textFit:function($element) {
            var tester, size, targetSize;
            targetSize = $element.height();
            init($element);
            $element.css('font-size', growTo(targetSize) + 'px');
            $element.find('p').ellipsis(false);
            tester.remove();

            function init(element) {
                // $('#resizeroo').remove();
                tester = element.clone();
                tester.css('display', 'none');
                tester.css('position', 'absolute');
                tester.css('height', 'auto');
                tester.css('width', 'auto');
                $('body').append(tester);
                size = 1;
                tester.css('font-size', size + 'px');
            }

            function setSize(targetSize) {
                size = targetSize;
                tester.css('font-size', size + 'px');
            }

            function growTo(limit) {
                var midpoint, lower = 1,
                        upper = limit - 1;

                // do binary search going midway to determine
                // the best size
                while (lower < upper) {

                    midpoint = Math.ceil((upper + lower) / 2);
                    setSize(midpoint);

                    if (Math.abs(limit - tester.height()) <= 1) {
                        // close enough
                        break
                    }

                    if (tester.height() >= limit) {
                        upper = size - 1;
                    }
                    else {
                        lower = size + 1;
                    }
                }

                while (tester.height() > limit) {
                    setSize(size - 1);
                }


                return(size);
            }
        }
    };

})(jQuery);

(function($){

    $.fn.ttwLoadMediaBoxDependencies = function(path, callback) {
        var load, dependencies;

        dependencies = {
            slickgrid:[
                "slickgrid-1.4.3/lib/jquery.event.drag-2.0.min.js",
                "slickgrid-1.4.3/slick.core.js",
                "slickgrid-1.4.3/slick.editors.js",
                "slickgrid-1.4.3/slick.grid.js",
                "slickgrid-1.4.3/plugins/slick.rowselectionmodel.js",
                "slickgrid-1.4.3/plugins/slick.rowmovemanager.js",
                "slickgrid-1.4.3/slick.grid.css"
            ],
            jqueryui:['jquery-ui-1.8.9.custom.min.js'],
            plugins:['plugins.js'],
            jplayer:['jPlayer/jquery.jplayer.js'],
            tmpl:['jquery.tmpl.min.js'],
            templates:['ttw.mediabox.templates.html']
        };


        if (path) {
            var realPaths = {};
            $.each(dependencies, function (key, dependency) {
                var files = [];
                $.each(dependency, function(i, file) {
                    files.push(path + file);
                });
                realPaths[key] = files;
            });
            dependencies = realPaths;
        }

        load = [].concat(dependencies.slickgrid, dependencies.jqueryui, dependencies.plugins, dependencies.jplayer, dependencies.tmpl);

        yepnope({
            load:load,
            complete: function () {
                if ($.isFunction(callback))
                {
                    callback();
                }


            }
        });

    }

})(jQuery);


//TODO: Request timeout message. Firefox cache seems to mess up html5 audio
//TODO: CHange interface elements to revealing module pattern for consistency
//TODO: Maybe each of the interface elements should use the prototype pattern to save memory
//TODO: Are the widgets actually getting deleted? Need to check to see if there are any references to them left so built in js garbage collection can take care of them.
