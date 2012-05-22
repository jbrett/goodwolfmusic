
var global_triple_box_locked = false;

jQuery(document).ready(function() {	
	jQuery(".orange_triple_btn").click(function() {
		if(global_triple_box_locked == false) {
			global_triple_box_locked = true;
			
			var btn_id = jQuery(this).attr("id");
			var widget_id = get_widget_id(btn_id);
			var block_id = get_block_id(btn_id);
			
			if(jQuery("#orange_triple_popular_btn_" + widget_id).hasClass("tab-1-disabled") == false) {
				jQuery("#orange_triple_popular_btn_" + widget_id).removeClass("active");
				jQuery("#orange_triple_popular_btn_" + widget_id).addClass("tab-1-disabled");
			}
			if(jQuery("#orange_triple_popular_btn_" + widget_id).hasClass("active") == true) {
				jQuery("#orange_triple_popular_btn_" + widget_id).removeClass("active");
			}
					
			if(jQuery("#orange_triple_recent_btn_" + widget_id).hasClass("tab-1-disabled") == false) {
				jQuery("#orange_triple_recent_btn_" + widget_id).addClass("tab-1-disabled");
			}
			if(jQuery("#orange_triple_recent_btn_" + widget_id).hasClass("tab-1-disabled") == true) {
				jQuery("#orange_triple_recent_btn_" + widget_id).removeClass("active");
			}	
			
			if(jQuery("#orange_triple_comments_btn_" + widget_id).hasClass("tab-1-disabled") == false ) {
				jQuery("#orange_triple_comments_btn_" + widget_id).addClass("tab-1-disabled");
			}		
			if(jQuery("#orange_triple_comments_btn_" + widget_id).hasClass("tab-1-disabled") == true ) {
				jQuery("#orange_triple_comments_btn_"  + widget_id).removeClass("active");
			}
			


			jQuery("#"+btn_id).removeClass("tab-1-disabled");
			jQuery("#"+btn_id).addClass("active");
			
			
			if(jQuery("#orange_triple_popular_" + widget_id).css("display") != "none") {
				var old_block = "orange_triple_popular";
			}
			if(jQuery("#orange_triple_recent_" + widget_id).css("display") != "none") {
				var old_block = "orange_triple_recent";
			} 
			if(jQuery("#orange_triple_comments_" + widget_id).css("display") != "none") {
				var old_block = "orange_triple_comments";
			}
			
			
			jQuery("#" + old_block + "_" + widget_id).fadeOut("medium",function() {
				
				jQuery("#" + block_id + "_" + widget_id).fadeIn("fast",function() {
					global_triple_box_locked = false;
					menu_cleanup(block_id,widget_id);
				});
			});
		}
		
		
			//Cufon.replace('.tabs-1 a', { hover: 'true' } );
			return false;
	
	});
});

function get_widget_id(str) {
	if(str.search("orange_triple_popular_btn_") != -1) {
		var btn = "orange_triple_popular_btn_";
		return str.substr(btn.length);
		
	} else if(str.search("orange_triple_recent_btn_") != -1) {
		var btn = "orange_triple_recent_btn_";
		return str.substr(btn.length);
		
	} else if(str.search("orange_triple_comments_btn_") != -1) {
		var btn = "orange_triple_comments_btn_";
		return str.substr(btn.length);
		
	} else {
		return 0;
	}
}

function get_block_id(str) {
	
	if(str.search("orange_triple_popular") != -1) {
		var btn = "orange_triple_popular";
		return str.substr(0,btn.length);
		
	} else if(str.search("orange_triple_recent") != -1) {
		var btn = "orange_triple_recent";
		return str.substr(0,btn.length);
		
	} else if(str.search("orange_triple_comments") != -1) {
		var btn = "orange_triple_comments";
		return str.substr(0,btn.length);
		
	} else {
		return 0;
	}

}

function menu_cleanup(block_id,widget_id) {
	if(block_id == "orange_triple_comments") {
		jQuery("#orange_triple_popular_" + widget_id).hide();
		jQuery("#orange_triple_recent" + widget_id).hide();
	}
	if(block_id == "orange_triple_popular_") {
		jQuery("#orange_triple_comments" + widget_id).hide();
		jQuery("#orange_triple_recent" + widget_id).hide();
	}
	if(block_id == "orange_triple_recent") {
		jQuery("#orange_triple_comments" + widget_id).hide();
		jQuery("#orange_triple_popular_" + widget_id).hide();
	}
}


/* -------------------------------------------------------------------------*
 * 						BACK TO TOP SCRIPT					
 * -------------------------------------------------------------------------*/
 
			jQuery(document).ready(function($){
				$(function () {
					$(window).scroll(function () { });
					$('.back-to-top a').click(function () {
						$('body,html').animate({
							scrollTop: 0
						}, 800);
						return false;
					});
				});
			});
