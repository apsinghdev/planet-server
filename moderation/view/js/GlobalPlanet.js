// Copyright (c) 2017 Euan Ong
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the The GNU Affero General Public
// License as published by the Free Software Foundation; either
// version 3 of the License, or (at your option) any later version.
//
// You should have received a copy of the GNU Affero General Public
// License along with this library; if not, write to the Free Software
// Foundation, 51 Franklin Street, Suite 500 Boston, MA 02110-1335 USA

function GlobalPlanet(Planet) {
	this.ProjectViewer = null;
	this.offlineHTML = '<div class="container center-align">'+_('Feature unavailable - cannot connect to server. Reload Music Blocks to try again.')+'</div>';
	this.noProjects = '<div class="container center-align">'+_('No results found.')+'</div>';
	this.tags = [];
	this.specialTags = null;
	this.defaultTag = null;
	this.searchMode = null;
	this.index = 0;
	this.page = 24;
	this.sortBy = null;
	this.cache = {};
	this.loadCount = 0;
	this.cards = [];
	this.loadButtonShown = true;
	this.searching = false;
	this.searchString = "";
	this.oldSearchString = "";
	this.DeleteModalID = null;
	this.UnreportModalID = null;
	this.Editor = null;

	this.initTagList = function(){
		for (var i = 0; i<this.specialTags.length; i++){
			var t = new GlobalTag(Planet);
			t.init(this.specialTags[i]);
			this.tags.push(t);
			if (this.specialTags[i].defaultTag==true){
				this.defaultTag=t;
			}
		}
		var keys = Object.keys(Planet.TagsManifest);
		for (var i = 0; i<keys.length; i++){
			var t = new GlobalTag(Planet);
			t.init({"id":keys[i]});
			this.tags.push(t);
		}
		this.sortBy = document.getElementById("sort-select").value;
		this.selectSpecialTag(this.defaultTag);
	};

	this.selectSpecialTag = function(tag){
		for (var i = 0; i<this.tags.length; i++){
			this.tags[i].unselect();
		}
		tag.select();
		tag.func();
	};

	this.unselectSpecialTags = function(){
		for (var i = 0; i<this.tags.length; i++){
			if (this.tags[i].specialTag){
				this.tags[i].unselect();
			}
		}
	};

	this.refreshTagList = function(){
		var tagids = [];
		for (var i = 0; i<this.tags.length; i++){
			if (this.tags[i].specialTag==false&&this.tags[i].selected==true){
				tagids.push(this.tags[i].id);
			}
		}
		if (tagids.length==0){
			this.selectSpecialTag(this.defaultTag);
		} else {
			this.unselectSpecialTags();
			this.searchTags(tagids);
		}
	};

	this.searchAllProjects = function(){
		this.searchMode = "ALL_PROJECTS";
		this.refreshProjects();
	};

	this.searchMyProjects = function(){
		this.searchMode = "USER_PROJECTS";
		this.refreshProjects();
	};

	this.searchReportedProjects = function(){
		this.searchMode = "REPORTED_PROJECTS";
		this.refreshProjects();
	};

	this.searchTags = function(tagids){
		this.searchMode = JSON.stringify(tagids);
		this.refreshProjects();
	};

	this.refreshProjects = function(){
		this.index = 0;
		this.cards = [];
		document.getElementById("global-projects").innerHTML = "";
		this.showLoading();
		this.hideLoadMore();
		if (this.oldSearchString!=""){
			Planet.ServerInterface.searchProjects(this.oldSearchString,this.sortBy,this.index,this.index+this.page+1,this.afterRefreshProjects.bind(this));
		} else {
			Planet.ServerInterface.downloadProjectList(this.searchMode,this.sortBy,this.index,this.index+this.page+1,this.afterRefreshProjects.bind(this));
		}
	};

	this.loadMoreProjects = function(){
		this.showLoading();
		this.hideLoadMore();
		if (this.oldSearchString!=""){
			Planet.ServerInterface.searchProjects(this.oldSearchString,this.sortBy,this.index,this.index+this.page+1,this.afterRefreshProjects.bind(this));
		} else {
			Planet.ServerInterface.downloadProjectList(this.searchMode,this.sortBy,this.index,this.index+this.page+1,this.afterRefreshProjects.bind(this));
		}
	};

	this.downloadCsv = function(dateFrom, dateTo){
		start = 0;
		end = 99;
		Planet.ServerInterface.downloadProjectsCsv(this.searchMode,this.sortBy,start,end,dateFrom,dateTo,() => {});
	};

	this.search = function(){
		if (!this.searching){
			if (this.searchString==""){
				this.oldSearchString = "";
				this.searching = false;
				this.showTags();
			} else {
				this.searching = true;
				this.hideTags();
			}
			this.oldSearchString = this.searchString;
			this.index=0;
			this.cards=[];
			document.getElementById("global-projects").innerHTML = "";
			this.showLoading();
			this.hideLoadMore();
			Planet.ServerInterface.searchProjects(this.oldSearchString,this.sortBy,this.index,this.index+this.page+1,this.afterRefreshProjects.bind(this));
		}
	};

	this.afterSearch = function(){
		this.searching = false;
		if (this.searchString!=this.oldSearchString){
			this.search();
		}
	};

	this.afterRefreshProjects = function(data){
		if (data.success){
			this.addProjects(data.data);
		} else {
			this.throwOfflineError();
		}
	};

	this.addProjects = function(data){
		var toDownload = [];
		for (var i = 0; i<data.length; i++){
			if (this.cache.hasOwnProperty(data[i][0])){
				if (this.cache[data[i][0]].ProjectLastUpdated!=data[i][1]){
					toDownload.push(data[i]);
				}
			} else {
				toDownload.push(data[i]);
			}
		}
		this.loadCount=toDownload.length;
		var l = data.length;
		if (l==this.page+1){
			data.pop();
		}
		if (l==0){
			this.throwNoProjectsError();
			this.afterAddProjects();
		} else if (this.loadCount==0){
			this.render(data);
			if (l==this.page+1){
				this.showLoadMore();
			} else {
				this.hideLoadMore();
			}
		} else if (l==this.page+1){
			this.downloadProjectsToCache(toDownload,function(){this.render(data);this.showLoadMore();}.bind(this));
		} else {
			this.downloadProjectsToCache(toDownload,function(){this.render(data);this.hideLoadMore();}.bind(this));
		}
	};

	this.downloadProjectsToCache = function(data,callback){
		this.loadCount = data.length;
		for (var i = 0; i<data.length; i++){
			(function(){
				var id = data[i][0];
				Planet.ServerInterface.getProjectDetails(id,function(d){var tempid = id;this.addProjectToCache(tempid,d,callback)}.bind(this));
			}.bind(this))();
		}
	};

	this.addProjectToCache = function(id,data,callback){
		if (data.success){
			this.cache[id]=data.data;
			this.cache[id].ProjectData = null;
			this.loadCount-=1;
			if (this.loadCount<=0){
				callback();
			}
		} else {
			this.throwOfflineError();
		}
	};

	this.forceAddToCache = function(id,callback){
		Planet.ServerInterface.getProjectDetails(id,function(d){this.addProjectToCache(id,d,callback)}.bind(this));
	};

	this.afterForceAddToCache = function(id,data,callback){
		if (data.success){
			this.cache[id]=data.data;
			this.cache[id].ProjectData = null;
			callback();
		} else {
			this.throwOfflineError();
		}
	};

	this.getData = function(id,callback){
		if (this.cache[id].ProjectData!=null){
			callback(this.cache[id].ProjectData);
		} else {
			this.downloadDataToCache(id,callback);
		}
	};

	this.downloadDataToCache = function(id,callback){
		Planet.ServerInterface.downloadProject(id,function(data){this.afterDownloadData(id,data,callback)}.bind(this));
	};

	this.afterDownloadData = function(id,data,callback){
		if (data.success){
			this.cache[id].ProjectData = Planet.ProjectStorage.decodeTB(data.data);
			callback(this.cache[id].ProjectData);
		} else {
			//TODO: Implement error message
		}
	};

	this.render = function(data){
		for (var i = 0; i<data.length; i++){
			if (this.cache.hasOwnProperty(data[i][0])){
				var g = new GlobalCard(Planet);
				g.init(data[i][0]);
				g.render();
				this.cards.push(g);
			} else {
				this.throwOfflineError();
				return;
			}
		}
		$('.tooltipped').tooltip({delay: 50});
		this.afterAddProjects();
	};

	this.afterAddProjects = function(){
		this.index+=this.page;
		this.hideLoading();
		if (this.oldSearchString!=""){
			this.afterSearch();
		}
	};

	this.throwOfflineError = function(){
		this.hideLoading();
		this.hideLoadMore();
		document.getElementById("global-projects").innerHTML = this.offlineHTML;
	};

	this.throwNoProjectsError = function(){
		this.hideLoading();
		this.hideLoadMore();
		document.getElementById("global-projects").innerHTML = this.noProjects;
	};

	this.hideLoading = function(){
		document.getElementById("global-load").style.display = "none";
	};

	this.showLoading = function(){
		document.getElementById("global-load").style.display = "block";
	};

	this.hideLoadMore = function(){
		document.getElementById("load-more-projects").style.display = "none";
		this.loadButtonShown = false;
	};

	this.showLoadMore = function(){
		var l = document.getElementById("load-more-projects");
		l.style.display = "block";
		l.classList.remove("disabled");
		this.loadButtonShown = true;
	};

	this.hideTags = function(){
		document.getElementById("tagscontainer").style.display = "none";
	};

	this.showTags = function(){
		document.getElementById("tagscontainer").style.display = "block";
	};

	this.deleteProject = function(id){
		delete this.cache[id];
		Planet.ServerInterface.deleteProject(id, this.afterDeleteProject.bind(this));
	}

	this.afterDeleteProject = function(data){
		if (!data.success){
			console.log(data.error);
			//TODO: We need better error handling for this.
		}
		Planet.GlobalPlanet.refreshProjects();
	}

	this.initDeleteModal = function(){
		var t = this;
		document.getElementById("deleter-button").addEventListener('click', function (evt) {
			if (t.DeleteModalID!=null){
				t.deleteProject(t.DeleteModalID);
			}
		});
	};

	this.openDeleteModal = function(id){
		this.DeleteModalID = id;
		var name = this.cache[id].ProjectName;
		document.getElementById("deleter-title").textContent = name;
		document.getElementById("deleter-name").textContent = name;
		$('#deleter').modal('open');
	};

	this.unreportProject = function(id){
		delete this.cache[id];
		Planet.ServerInterface.unreportProject(id, this.afterUnreportProject.bind(this));
	}

	this.afterUnreportProject = function(data){
		if (!data.success){
			console.log(data.error);
			//TODO: We need better error handling for this.
		}
		Planet.GlobalPlanet.refreshProjects();
	}

	this.initUnreportModal = function(){
		var t = this;
		document.getElementById("unreporter-button").addEventListener('click', function (evt) {
			if (t.UnreportModalID!=null){
				t.unreportProject(t.UnreportModalID);
			}
		});
	};

	this.openUnreportModal = function(id){
		this.UnreportModalID = id;
		var name = this.cache[id].ProjectName;
		document.getElementById("unreporter-title").textContent = name;
		document.getElementById("unreporter-name").textContent = name;
		$('#unreporter').modal('open');
	};

	this.initInviteModal = function(){
		var t = this;
		document.getElementById("invitelink").addEventListener('click', function (evt) {
			Planet.ServerInterface.generateInvite(t.openInviteModal.bind(t));
		});
	};

	this.openInviteModal = function(link){
		if (!link.success){
			return;
			//TODO: Error logging
		}
		link = link.data;
		var prefix = "https://musicblocks.sugarlabs.org/planet-server/moderation/register.php?token=";
		var url = prefix+link;
		document.getElementById("invitelinkbox").value = url;
		$('#invitelinkmodal').modal('open');
	};

	this.init = function(){
		if (!Planet.ConnectedToServer){
			document.getElementById("globaltitle").textContent = _("Cannot connect to server");
			document.getElementById("globalcontents").innerHTML = this.offlineHTML;
		} else {
			var t = this;
			$('#sort-select').material_select(function (evt) {
				t.sortBy = document.getElementById("sort-select").value;
				t.refreshProjects();
			});
			this.specialTags = 
			[{"name":"All Projects","func":this.searchAllProjects.bind(this),"defaultTag":true},
			{"name":"Reported Projects","func":this.searchReportedProjects.bind(this)}];
			this.initTagList();
			var t = this;
			document.getElementById("load-more-projects").addEventListener('click', function (evt) {
				if (t.loadButtonShown){
					t.loadMoreProjects();
				}
			});
			var debouncedfunction = debounce(this.search.bind(this),250);
			document.getElementById("global-search").addEventListener('input', function (evt) {
				t.searchString = this.value;
				debouncedfunction();
			});
			document.getElementById("search-close").addEventListener('click', function (evt) {
				document.getElementById("global-search").value="";
				t.searchString="";
				this.style.display = "none";
				debouncedfunction();
			});
			
			document.getElementById("download-csv-file").addEventListener('click', function (evt) {
				var dateFrom = document.getElementById('start-range').value;
        		var dateTo = document.getElementById('end-range').value;
				t.downloadCsv(dateFrom, dateTo);
			});

			this.ProjectViewer = new ProjectViewer(Planet);
			this.ProjectViewer.init();
			if (PROJECT_TO_OPEN!=null){
				this.forceAddToCache(PROJECT_TO_OPEN, function(){this.ProjectViewer.open(PROJECT_TO_OPEN)}.bind(this));
			}
			this.initDeleteModal();
			this.initUnreportModal();
			this.initInviteModal();
			this.Editor = new Publisher(Planet);
			this.Editor.init();
		}
	};
};