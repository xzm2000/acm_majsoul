/**
 * scrollboard.js
 * ACM竞赛滚榜展示插件，基于JQuery、Bootstrap
 *
 * Version 1.0.0
 * Author: qinshaoxuan qsxuan.com
 * Github: https://github.com/qinshaoxuan/ScrollBoard
 * Demo: https://qinshaoxuan.github.io/ScrollBoard/
 * 
 */



/**
 * 从服务器获取提交列表，可按后台json格式修改
 * @return {Array<Submit>} 初始化后的Submit对象数组
 */


function getSubmitList() {
	var data = new Array();
	$.ajax({
        type: "GET",
        content: "application/x-www-form-urlencoded",
        url: "data/submit.json?"+Date.now(),
        dataType: "json",
        data: {},
        async: false,
        success: function(result) {
            for (var i in result) {
                var submit = result[i];
				var team = submit.team;
				var problem = parseInt(submit.num);
				var score = parseInt(submit.score);
				var alphabetId =String.fromCharCode(problem - 1 + 65);
                data.push(new Submit(1, team, alphabetId, StringToDate("2019-01-01 12:00:00"), score));
            }

        },
        error: function() {
            alert("获取Submit数据失败");
        }
    });
	return data;
}

function getTeamList() {
	var data = new Array();
	$.ajax({
        type: "GET",
        content: "application/x-www-form-urlencoded",
        url: "data/team.json?"+Date.now(),
        dataType: "json",
        async: false,
        data: {},
        success: function(result) {
            for (var key in result) {
                var team = result[key];
				var ss=team.name;
				var id = parseInt(team.id);
				while (ss!=ss.replace('.','_')) ss=ss.replace('.','_');
				if (id <= 32)
					data[id]=new Team(id, ss , team.sex, true);
				else
				{
					data[id] = new Team(id,ss,team.sex,false,team.score);
				}
            }
        },
        error: function() {
            alert("获取Team数据失败");
        }
    });
    return data;
}

/**
 * yyyy-mm-dd hh:mm:ss格式转Date
 * @param {Date} s 字符串对应的日期
 */
function StringToDate(s) {
    var d = new Date();
    d.setYear(parseInt(s.substring(0, 4), 10));
    d.setMonth(parseInt(s.substring(5, 7) - 1, 10));
    d.setDate(parseInt(s.substring(8, 10), 10));
    d.setHours(parseInt(s.substring(11, 13), 10));
    d.setMinutes(parseInt(s.substring(14, 16), 10));
    d.setSeconds(parseInt(s.substring(17, 19), 10));
	d.setMilliseconds(0);
    return d;
}



/**
 * Submit对象
 * @param {int}     submitId    全局runID
 * @param {int}     teamId      队伍ID
 * @param {String}  alphabetId  比赛中的题目ID：A,B,C...
 * @param {int}     subTime     提交时间
 * @param {int}     resultId    判题结果ID
 */
function Submit(submitId, teamId, alphabetId, subTime, resultId) {
    this.submitId = submitId; //全局runID
    this.teamId = teamId; //队伍ID
    this.alphabetId = alphabetId; //比赛中的题目ID：A,B,C,D...
    this.subTime = new Date(subTime);
    /**
     * 判题结果ID
     * @type {int}
     * @value 0 Accepted
     * @value 1 Presentation Error
     * @value 2 Time Limit Exceeded
     * @value 3 Memory Limit Exceeded
     * @value 4 Wrong Answer
     * @value 5 Runtime Error
     * @value 6 Output Limit Exceeded
     * @value 7 Compile Error
     * @value 8 System Error
     * @value 9 Security Error
     * @value -1 Waiting
     */
    this.resultId = resultId;
}

/**
 * TeamProblem对象，用来存放每个队伍的每道题的提交情况
 */
function TeamProblem() {
    this.alphabetId = "";
    this.isAccepted = false;
    this.penalty = 0; //罚时毫秒数
    this.acceptedTime = new Date(); //AC时间
    this.submitCount = 0; //AC前提交次数，如果AC了，值加1
	this.realCount = 0;
    this.isUnkonwn = false; //是否为封榜后提交，如果封榜前已AC，也为false
	this.ACsubmitID = 0;
}

/**
 * Team对象
 * @param {int}     teamId      队伍ID
 * @param {String}  teamName    队伍名
 * @param {String}  teamMember  队员
 * @param {boolean} official     是否计入排名
 */
function Team(teamId, teamName, gender, official, score = "") {
    this.teamId = teamId; //队伍ID
    this.teamName = teamName; //队伍名
    this.official = official; //计入排名
    this.solved = 0; //通过数
    this.penalty = 0; //罚时,单位为毫秒
    this.gender = gender; //女队,默认否
    this.submitProblemList = []; //提交题目列表
    this.unkonwnAlphabetIdMap = new Array(); //未知的题目AlphabetId列表
    this.submitList = []; //提交列表
    this.lastRank = 0; //最终排名
    this.nowRank = 0; //当前排名
	this.lastAC = 0;
	this.score = score;
}

/**
 * Team对象初始化函数，更新到封榜时的状态
 * @param  {Date}   startTime       比赛开始时间
 * @param  {Date}   freezeBoardTime 封榜时间
 */
Team.prototype.init = function(board) {
	//按提交顺序排序
	var startTime = board.startTime;
	var freezeBoardTime = board.freezeBoardTime;
    this.submitList.sort(function(a, b) {
        return a.submitId - b.submitId;
    });
	//if (this.gender) this.penalty=-20;
    for (var key in this.submitList) {
        var sub = this.submitList[key];
        //创建对象
        var p = this.submitProblemList[sub.alphabetId];
        if (!p) p = new TeamProblem();
        //设置alphabetId
        p.alphabetId = sub.alphabetId;
        //已经AC的题目不再计算
		this.solved ++;
		this.penalty += sub.resultId;
        p.submitCount++;
		if (!p.isAccepted && sub.resultId!=7) p.realCount++;
		p.penalty = sub.resultId;
        p.isAccepted = true;
        //更新submitProblemList
        this.submitProblemList[p.alphabetId] = p;
    }
}

/**
 * 计算Team中有多少道题状态未知
 * @return {int} 未知状态题目的数量
 */
Team.prototype.countUnkonwnProblme = function() {
    var count = 0;
    for (var key in this.unkonwnAlphabetIdMap) {
        count++;
    }
    return count;
}

/**
 * 滚榜时，更新一个队伍的一个题的状态
 * @return {boolean} true:当前队伍排名上升,false:排名无变化
 */
Team.prototype.updateOneProblem = function() {
    for (var key = 0 ; key < board.problemCount ; key++) {
		var subProblem = this.submitProblemList[String.fromCharCode(key+65)];
		if (!subProblem) continue;
		//如果题目结果未知
        if (subProblem.isUnkonwn) {
            //更新题目状态
            subProblem.isUnkonwn = false;
            delete this.unkonwnAlphabetIdMap[subProblem.alphabetId];
            //如果AC，则更新题目状态
            if (subProblem.isAccepted) {
				subProblem.submitCount = subProblem.realCount;
                subProblem.penalty += subProblem.acceptedTime + (subProblem.submitCount - 1) * 20 * 60 * 1000;
                this.solved++;
                this.penalty += subProblem.penalty;
                return true;
            }
            return false;
        }
    }
}


/**
 * 队伍排位函数
 * @param {Team} a Team a
 * @param {Team} b Team b
 * @return {int} 负数a排位高，正数b排位高
 */
function TeamCompare(a, b) {
	if (a.official != b.official)
		return a.official > b.official ? -1 : 1;
    if (a.penalty != b.penalty) //第二关键字，罚时少者排位高
        return a.penalty > b.penalty ? -1 : 1;
    if (a.solved != b.solved) //第一关键字，通过题数高者排位高
        return a.solved > b.solved ? -1 : 1;
	return a.teamId < b.teamId ? -1 : 1;//对于0题队固定顺序
}



/**
 * Board对象
 * @param {int}         problemCount    题目数量
 * @param {Array<int>}  medalCounts     奖牌数,无特等奖则为3个数,有特等奖则为4个数,第一个为特等奖
 * @param {Date}        startTime       比赛开始时间
 * @param {Date}        freezeBoardTime 封榜时间
 */
function Board(problemCount, medalCounts, startTime, freezeBoardTime) {
    this.problemCount = problemCount; //题目数量
    this.medalCounts = medalCounts; //奖牌数数组,无特等奖则为3个数,有特等奖则为4个数，第一个为特等奖
    this.medalRanks = []; //每个奖牌的最后一名的RANK值
    this.medalStr = ["gold", "silver", "bronze"];
    this.problemList = []; //题目alphabetId编号列表
    this.startTime = startTime;
    this.freezeBoardTime = freezeBoardTime;
    this.teamList = []; //从服务器获取的teamList，为teamId与Team对象的映射
    this.submitList = []; //从服务器获取的所有的submitList,Submit对象数组
    this.teamNowSequence = []; //当前队伍排名，存队伍ID
    this.teamNextSequence = []; //下一步队伍排名，存队伍ID
    this.teamCount = 0; //队伍数量
    this.displayTeamPos = 0; //当前展示的队伍位置
    this.noAnimate = true; //当前无动画进行
	this.FBList = [];
    //根据题目数量设置alphabetId
    var ACode = 65;
    for (var i = 0; i < problemCount; i++)
	{
        this.problemList.push(String.fromCharCode(ACode + i));
		this.FBList.push(0);
	}

    //计算medalRanks
    this.medalRanks[0] = medalCounts[0];
    for (var i = 1; i < this.medalCounts.length; ++i) {
        this.medalRanks[i] = this.medalCounts[i] + this.medalRanks[i - 1];
    }

    //从服务器得到submitList和teamList
    this.submitList = getSubmitList(startTime);
    this.teamList = getTeamList();



    //将submit存到对应的Team对象里
    for (var key in this.submitList) {
        var sub = this.submitList[key];
        this.teamList[sub.teamId].submitList.push(sub);
    }



    //初始化Team对象，同时将队伍ID放入序列
    for (var key in this.teamList) {
        var team = this.teamList[key];
        team.init(this);
        this.teamNowSequence.push(team);
        this.teamCount++;
    }
    this.displayTeamPos = this.teamCount - 1;
    //队伍排序
    this.teamNowSequence.sort(function(a, b) {
        return TeamCompare(a, b);
    });
    this.teamNextSequence = this.teamNowSequence.slice(0);

}


/**
 * 更新队伍排序,得到下一个队伍移动后的序列
 * @return {int} 排名上升的队伍要插入的位置，如果无变化返回-1
 */
Board.prototype.updateTeamSequence = function() {
    var teamSequence = this.teamNextSequence.slice(0); //复制数组，js为引用传递
    teamSequence.sort(function(a, b) {
        return TeamCompare(a, b);
    });


    //找到第一个改变的位置，即为排名上升的队伍要插入的位置
    var toPos = -1;
    for (var i = 0; i < this.teamCount; i++) {
        if (this.teamNextSequence[i].teamId != teamSequence[i].teamId) {
            toPos = i;
            break;
        }
    }

    //更新队列
    this.teamNowSequence = this.teamNextSequence.slice(0);
    this.teamNextSequence = teamSequence.slice(0);

    return toPos;
}


/**
 * 不断更新最后一个unkonwn队伍的题目状态，直到排名发生变化或者无题目可更新
 * @return {Team} 返回正在更新的Team对象，没有则返回null
 */
Board.prototype.UpdateOneTeam = function() {
    //得到需要更新的队伍在当前排名中的的位置
    var updateTeamPos = this.teamCount - 1;
    while (updateTeamPos >= 0 && this.teamNextSequence[updateTeamPos].countUnkonwnProblme() < 1)
        updateTeamPos--;
    //如果有队伍可更新
    if (updateTeamPos >= 0) {
        //不断更新队伍题目状态，直到排名发生变化或者无题目可更新
        while (this.teamNextSequence[updateTeamPos].countUnkonwnProblme() > 0) {
            //更新一个题目状态
            var result = this.teamNextSequence[updateTeamPos].updateOneProblem();
            return this.teamNextSequence[updateTeamPos];
        }
    }
    return null;
}

/**
 * 显示封榜时的状态
 */
Board.prototype.showInitBoard = function() {

    //设置表头宽度百分比
    var rankPer = 5; //Rank列宽度百分比
    var teamPer = 25; //Team列宽度百分比
    var solvedPer = 4; //Solved列宽度百分比
    var penaltyPer = 7; //Penalty列宽度百分比
    var problemStatusPer = (100.0 - rankPer - teamPer - solvedPer - penaltyPer) / this.problemCount; //Problem列宽度百分比

    //表头
    var headHTML =
        "<div id=\"timer\"></div>\
        <div class=\"ranktable-head\">\
            <table class=\"table\">\
                <tr>\
                    <th width=\"" + rankPer + "%\">Rank</th>\
                    <th width=\"" + teamPer + "%\">Team</th>\
                    <th width=\"" + solvedPer + "%\">Finish</th>\
                    <th width=\"" + penaltyPer + "%\">Score</th>";
    var footHTML =
        "</tr>\
            </table>\
        </div>";
    $('body').append(headHTML + footHTML);

    //题目列
    for (var i = 0; i < this.problemList.length; i++) {
        var alphabetId;
		if (i == 0) alphabetId = "预赛带分";
		else alphabetId = "第" + i + "局";
        var bodyHTML = "<th width=\"" + problemStatusPer + "%\">" + alphabetId + "</th>";
        $('.ranktable-head tr').append(bodyHTML);
    }

    var maxRank = 1;

    //队伍
    for (var i = 0; i < this.teamCount; i++) {

        var team = this.teamNowSequence[i];

        //计算每支队伍的排名和奖牌情况
        var rank = maxRank-1;
        var medal = -1;
		rank = maxRank;
		maxRank = rank + 1;


        //构造HTML
        var headHTML =
            "<div id=\"team_" + team.teamId + "\" class=\"team-item\" team-id=\"" + team.teamId + "\"> \
                    <table class=\"table\"> \
                        <tr>";
		var rankHTML = "<th class=\"rank\" width=\"" + rankPer + "%\">" + rank + "</th>";
        var teamHTML; 
		if (team.gender == 1)
			teamHTML = "<td class=\"team-name\" width=\"" + teamPer + "%\"><span><font color=\"#FF9999\">" + team.teamName +  "</font></span></td>";
		else
			teamHTML = "<td class=\"team-name\" width=\"" + teamPer + "%\"><span>" + team.teamName +  "</span></td>";
        var solvedHTML;
		if (team.official==true)
			solvedHTML = "<td class=\"solved\" width=\"" + solvedPer + "%\">" + (team.solved - 1) + "</td>";
		else solvedHTML = "<td class=\"solved\" width=\"" + solvedPer + "%\"><font color=\"red\">" + "淘汰" + "</font></td>";
        var penaltyHTML;
		if (team.official==true)
			penaltyHTML = "<td class=\"penalty\" width=\"" + penaltyPer + "%\">" + parseInt(team.penalty/10) + "." + parseInt(Math.abs(team.penalty) %10) + "</td>";
		else 
			penaltyHTML = "<td class=\"penalty\" width=\"" + penaltyPer + "%\">" + team.score + "</td>";
        var problemHTML = "";
        for (var key in this.problemList) {
            problemHTML += "<td class=\"problem-status\" width=\"" + problemStatusPer + "%\" alphabet-id=\"" + this.problemList[key] + "\">";
            var tProblem = team.submitProblemList[this.problemList[key]];
            if (tProblem) {
                if (tProblem.isUnkonwn)
                    problemHTML += "<span class=\"label label-warning\">" + tProblem.submitCount + "</span></td>";
                else {
                    if (tProblem.penalty >= 0) {
							problemHTML += "<span class=\"label label-success\">" + parseInt(tProblem.penalty/10) + "." + parseInt(Math.abs(tProblem.penalty) % 10) + "</td>";
                        //problemHTML += "<span class=\"label label-success\">" + tProblem.submitCount + "/" + parseInt(tProblem.acceptedTime / 1000.0 / 60.0) + "</span></td>";
                    } else {
                        problemHTML += "<span class=\"label label-danger\">" + parseInt(tProblem.penalty/10) + "." + parseInt(Math.abs(tProblem.penalty) % 10) + "</span></td>";
                    }
                }
            }
			else{
				if (team.official == true)
					problemHTML += "<span class=\"label label-warning\">" + "--" + "</span></td>";
			}
        }
        var footHTML =
            "</tr> \
                        </table> \
                    </div>";

        var HTML = headHTML + rankHTML + teamHTML + solvedHTML + penaltyHTML + problemHTML + footHTML;
        //填充HTML
        $('body').append(HTML);
        //设置奖牌对应的CSS样式
		/*
        if (team.gender == 1)
            $("#team_" + team.teamId).addClass("girl");
		*/

    }


    //构造一个空的队伍，填充底部
    var headHTML =
        "<div id=\"team-void\" class=\"team-item\"> \
                    <table class=\"table\"> \
                        <tr>";
    var rankHTML = "<th class=\"rank\" width=\"" + rankPer + "%\"></th>";
    var teamHTML = "<td class=\"team-name\" width=\"" + teamPer + "%\"></td>";
    var solvedHTML = "<td class=\"solved\" width=\"" + solvedPer + "%\"></td>";
    var penaltyHTML = "<td class=\"penalty\" width=\"" + penaltyPer + "%\"></td>";
    var problemHTML = "";
    for (var key in this.problemList) {
        problemHTML += "<td class=\"problem-status\" width=\"" + problemStatusPer + "%\" alphabet-id=\"" + this.problemList[key] + "\"></td>";
    }
    var footHTML =
        "</tr> \
                        </table> \
                    </div>";

    var HTML = headHTML + rankHTML + teamHTML + solvedHTML + penaltyHTML + problemHTML + footHTML;
    //填充HTML
    $('body').append(HTML);



    //按排名对队伍的div进行排序
    var headerHeight = 44; //表头的高度
    var teamHeight = 68; //队伍行的高度
    for (var i = 0; i < this.teamCount; ++i) {
        //var teamId = this.teamList[this.teamNowSequence[i]].teamId;
        var teamId = this.teamNowSequence[i].teamId;
        $("div[team-id=\"" + teamId + "\"]").stop().animate({ top: i * teamHeight + headerHeight }, 300);
    }
    //移到底部
    $("#team-void").stop().animate({ top: this.teamCount * teamHeight + headerHeight }, 300);
}

/**
 * 更新队伍的表现状态，即改变HTML样式
 * @param  {Team} team 要改变的Team对象
 * @return {boolean} 要更新的题目是否AC
 */
Board.prototype.updateTeamStatus = function(team) {
    var thisBoard = this;
    //更新ProblemStatus
    for (var key in team.submitProblemList) {
        var tProblem = team.submitProblemList[key];
            //构造题目状态HTML
            problemHTML = "";
            if (tProblem.isUnkonwn)
                problemHTML = "<span class=\"label label-warning\">" + tProblem.submitCount + "</td>";
            else {
                if (tProblem.isAccepted) {
					if (tProblem.ACsubmitID==board.FBList[tProblem.alphabetId.charCodeAt(0)-65])
						problemHTML = "<span class=\"label label-primary\">" + tProblem.submitCount + "/" + parseInt(tProblem.acceptedTime / 1000.0 / 60.0) + "</td>";
					else
                    	problemHTML = "<span class=\"label label-success\">" + tProblem.submitCount + "/" + parseInt(tProblem.acceptedTime / 1000.0 / 60.0) + "</td>";
                } else {
                    problemHTML = "<span class=\"label label-danger\">" + tProblem.submitCount + "</td>";
                }
            }


            var $problemStatus = $("#team_" + team.teamId + " .problem-status[alphabet-id=\"" + key + "\"]");
            var $statusSpan = $problemStatus.children('span[class="label label-warning"]');


            //让题目状态闪烁，并更新状态
            if (tProblem.isUnkonwn == false) {

                //加高亮边框前去掉所有高亮边框
                $('.team-item.hold').removeClass("hold");
                var $team = $("div[team-id=\"" + team.teamId + "\"]");
                //加高亮边框
                $team.addClass("hold");

                //得到TeamDiv距顶部的高度
                var clientHeight = document.documentElement.clientHeight || document.body.clientHeight || 0;
                var teamTopHeight = $team.offset().top - clientHeight + 100;


                //移动视点
                $('body,html').stop().animate({
                        scrollTop: teamTopHeight
                    },
                    500);

                //传参，不懂原理，用此可以在动画的回调函数使用参数
                (function(thisBoard, tProblem, problemHTML) {
                    //闪烁两次后显示未知题目的结果
                    var speed = 400; //闪烁速度
                    $statusSpan.fadeOut(speed).fadeIn(speed).fadeOut(speed).fadeIn(speed, function() {
                        //更新题目表现状态
                        $(this).parent().html(problemHTML);
                    });
                })(thisBoard, tProblem, problemHTML);
            }
    }

    //延时更新榜单
    //传参，不懂原理，用此可以在动画的回调函数使用参数
    (function(thisBoard, team) {
        //延时1.6s
        $('#timer').animate({ margin: 0 }, 1600, function() {

            /*
            更新Rank
             */
            var maxRank = 1;

            //移除div中的奖牌样式
            for (var i in thisBoard.medalStr) {
                $(".team-item").removeClass(thisBoard.medalStr[i]);
            }

            //对于每个队计算排名和奖牌情况
            for (var i = 0; i < thisBoard.teamCount; i++) {
                var t = thisBoard.teamNextSequence[i];
                var medal = -1;
                var rankValue = maxRank-1;
                if (t.solved != 0) {
					if (t.official==true)
					{
                    	rankValue = maxRank;
                    	maxRank = rankValue + 1;
					}
                    for (var j = thisBoard.medalRanks.length - 1; j >= 0; j--) {
                        if (rankValue <= thisBoard.medalRanks[j])
                            medal = j;
                    }
                } else {
                    rankValue = maxRank;
                    medal = -1;
                }
				

                $team = $("div[team-id=\"" + t.teamId + "\"]");

                if (medal != -1)
                    $team.addClass(thisBoard.medalStr[medal]);
				if (t.official==true)
                	$("#team_" + t.teamId + " .rank").html(rankValue);
				else 
					$("#team_" + t.teamId + " .rank").html("*");

            }

            //更新Solved
            $("#team_" + team.teamId + " .solved").html(team.solved);

            //更新Penaly
            $("#team_" + team.teamId + " .penalty").html(parseInt(team.penalty / 1000.0 / 60.0));
        }, false);

    })(thisBoard, team);

}


/**
 * 更新队伍div的位置
 * @param  {int} toPos 当前关注队伍在序列中的终点位置，-1为不移动
 */
Board.prototype.moveTeam = function(toPos) {
    var thisBoard = this;
    //传参，不懂原理，用此可以在动画的回调函数使用参数
    (function(thisBoard) {
        var headerHeight = 44;
        var teamHeight = 68;
        for (var i = 0; i < thisBoard.teamCount; ++i) {
            var teamId = thisBoard.teamNextSequence[i].teamId;
            //延时2.2s后更新位置，为了等待题目状态更新完成
            if(toPos != -1)
                $("div[team-id=\"" + teamId + "\"]").animate({ margin: 0 }, 2200).animate({ top: i * teamHeight + headerHeight }, 1000, function() {
                    thisBoard.noAnimate = true;
                });
            else
                $("div[team-id=\"" + teamId + "\"]").animate({ margin: 0 }, 1800 ,function() {
                    thisBoard.noAnimate = true;
                });
        }
    })(thisBoard);
}

/**
 * 按下按键时调用的函数，包括榜更新一步的过程
 */
Board.prototype.keydown = function() {
    //等动画结束后再进行下一步
    if (this.noAnimate) {
        this.noAnimate = false;
        //更新一支队伍的状态,没有则team==null
        var team = this.UpdateOneTeam();
        if (team) {
            //根据现在的状态更新序列
            var toPos = this.updateTeamSequence();
            //更新队伍HTML内容
            this.updateTeamStatus(team);
            //移动队伍
            this.moveTeam(toPos);
        } else {
            //无队伍可更新时取消高亮边框
            $('.team-item.hold').removeClass("hold");
        }
    }
}
