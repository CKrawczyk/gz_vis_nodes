import pico
import re
import mysql.connector

gz2_valid_path={0:[1,2,3],
                1:[16,17,18],
                2:[4,5],
                3:[-1],
                4:[25,26,27],
                5:[6,7],
                6:[8,9],
                7:[8,9],
                8:[28,29,30],
                9:[10,11,12,13],
                10:[14,15],
                11:[14,15],
                12:[14,15],
                13:[14,15],
                14:[19,20,21,22,23,24,38],
                15:[-1],
                16:[14,15],
                17:[14,15],
                18:[14,15],
                19:[-1],
                20:[-1],
                21:[-1],
                22:[-1],
                23:[-1],
                24:[-1],
                25:[14,15],
                26:[14,15],
                27:[14,15],
                28:[31,32,33,34,36,37],
                29:[31,32,33,34,36,37],
                30:[31,32,33,34,36,37],
                31:[10,11,12,13],
                32:[10,11,12,13],
                33:[10,11,12,13],
                34:[10,11,12,13],
                36:[10,11,12,13],
                37:[10,11,12,13],
                38:[-1]}

gz3_valid_path={0:[1,2,3],
                1:[16,17,18],
                2:[39,40],
                3:[-1],
                4:[25,26,27],
                5:[6,7],
                6:[8,9,28,29,30],
                7:[8,9,28,29,30],
                8:[28,29,30],
                9:[10,11,12,13],
                10:[14,15],
                11:[14,15],
                12:[14,15],
                13:[14,15],
                14:[19,20,21,22,23,24,38],
                15:[-1],
                16:[14,15],
                17:[14,15],
                18:[14,15],
                19:[-1],
                20:[-1],
                21:[-1],
                22:[-1],
                23:[-1],
                24:[-1],
                25:[14,15],
                26:[14,15],
                27:[14,15],
                28:[31,32,33,34,36,37],
                29:[31,32,33,34,36,37],
                30:[31,32,33,34,36,37],
                31:[10,11,12,13],
                32:[10,11,12,13],
                33:[10,11,12,13],
                34:[10,11,12,13],
                36:[10,11,12,13],
                37:[10,11,12,13],
                38:[-1],
                39:[60,50,51,52,53,54],
                40:[4,5],
                41:[],
                42:[],
                43:[45,46],
                44:[55,56],
                45:[55,56],
                46:[55,56],
                47:[43,44],
                48:[43,44],
                49:[43,44],
                50:[43,44],
                51:[47,48,49,59],
                52:[47,48,49,59],
                53:[47,48,49,59],
                54:[47,48,49,59],
                55:[57,58],
                56:[57,58],
                57:[14,15],
                58:[14,15],
                59:[6,7],
                60:[16,17,18,55,56]}
    
def valid_path(p,vp):
    l=len(p)
    p2=p+[-1]
    valid=True
    for i in range(l):
        valid = (valid) and (p2[i+1] in vp[p2[i]])
        if not valid:
            return valid
    return valid

def get_random_name(table='gz2'):
    cnx=mysql.connector.connect(user='root')
    cnx.database=table
    cursor=cnx.cursor()
    gal_name,gal_id,ra_gal,dec_gal,url=cursor.callproc('pGetRandomObj',args=(0,0,0,0,''))
    cnx.close()
    return {"gal_name":gal_name}

def get_path(table='gz2',argv='180 0'):
    cnx=mysql.connector.connect(user='root')
    cnx.database=table
    cursor=cnx.cursor()
    
    # split argv on "words"
    argv=re.findall(r"[\w]+",argv)
    L=len(argv)
    if L==1:
        # look up by sdssid
        sdssid,gal_name,gal_id,ra_gal,dec_gal,url=cursor.callproc('pGetNearestObjID',args=(argv[0],0,0,0,0,''))
    else:
        # look up by ra dec
        ra,dec=map(float,argv)
        ra,dec,gal_name,gal_id,ra_gal,dec_gal,url=cursor.callproc('pGetNearestObj',args=(ra,dec,0,0,0,0,''))
    
    if table=='gz2':
        vp=gz2_valid_path
    elif table=='gz3':
        vp=gz3_valid_path
        
    cursor.callproc('pGetVotePath',args=(gal_id,))
    path=cursor.stored_results().next().fetchall()

    path_dict={}
    odd_dict={}
    for p in path:
        i=map(int,p[0].split(','))
        # detect index answering the frist question in a classification
        # this will avoid the issue when people hit the reset button
        idx_first=[x for x,y in enumerate(i) if (y==1 or y==2 or y==3)]
        # only take the final time through the tree
        if len(idx_first)>0: # sometimes the first node is missing!
            i=i[idx_first[-1]:]
            i=[0]+i
            # check that all votes makes a vlid path through the tree (no missing or repeated nodes!)
            if valid_path(i,vp):
                if 14 in i:
                    odd_dict[i[-1]]=odd_dict.get(i[-1],0)+1
                    i=i[:-2]
                elif 15 in i:
                    i=i[:-1]
                for key in zip(i[:-1],i[1:]):
                    path_dict[key]=path_dict.get(key,0)+1

    # convert odd_dict into json syntax and sorted by vote (max first)
    odd_list=[]
    for key,value in odd_dict.iteritems():
        odd_list.append([key,value])
    odd_list.sort(key=lambda x: x[1])
    odd_list=odd_list[::-1]
    odd_list=[{'name':k[0], 'value':k[1]} for k in odd_list]
    
    links=[{'source':k[0], 'target':k[1], 'value': v} for k,v in path_dict.iteritems()]

    if table=='gz2':
        # have to ender group id by hand, no easy way to automate this (maybe...)
        group_id=[0,1,2,4,2,3,3,3,3,3,3,3,3,3,5,5,1,1,1,5,5,5,5,5,5,2,2,2,3,3,3,3,3,3,3,3,3,5]
        get_answers='''select a.value, t.name, a.id
        from answers a join tasks t on a.task_id = t.id order by a.id asc'''
    elif table=='gz3':
        # have to ender group id by hand, no easy way to automate this (maybe...)
        group_id=[0,1,2,5,2,3,3,3,3,3,3,3,3,3,6,6,1,1,1,6,6,6,6,6,6,2,2,2,3,3,3,3,3,3,3,3,3,6,4,2,
                  4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4]
        get_answers='''select a1.value, t1.name, a1.answer_id
        from answer_translations a1
        join answers a2 on a2.id = a1.answer_id
        join task_translations t1 on t1.task_id = a2.task_id
        where (a1.locale='en') and (t1.locale='en')
        order by answer_id asc;'''
    
    cursor.execute(get_answers)
    answers=[['All','',0]]+map(list,cursor.fetchall())

    # order: answer, question, answer_id, group_id
    node_names=['name', 'question', 'answer_id']
    nodes=[dict(zip(node_names,i)+[('group',j)]) for i,j in zip(answers,group_id)]
    
    # check to make sure no node id was skipped
    # this makes sure the answer_id used in links matches up with the order of the nodes
    if len(nodes)<=nodes[-1]['answer_id']:
        # add a blank node there
        blank_node={'answer':'', 'question':'', 'answer_id':-1, 'group':-1}
        ct=0
        idx_to_append=[]
        for c,n in zip(nodes[:-1],nodes[1:]):
            dif=n['answer_id']-c['answer_id']
            if dif>1:
                idx_to_append+=range(ct+1,ct+dif)
            ct+=dif
        for idx in idx_to_append:
            blank_node['answer_id']=idx
            nodes.insert(idx,blank_node)
    
    # put it all together
    out={'nodes':nodes,'links':links,'image_url':url,'ra':ra_gal,'dec':dec_gal,'gal_name':gal_name,'odd_list':odd_list}
    #print json.dumps(out)
    cnx.close()
    return out
    
if __name__=="__main__":
    import json
    json_list3 = ['10000189', '10000215', '10000235', '10000249', '10000278',
                '10000325', '10000327', '10000331', '10000395', '10000416',
                '10000449', '10000457', '10000493', '10000504', '10000514',
                '10000519', '10002860', '10002902', '10002932', '10002937',
                '10003019', '10003051', '10003061', '10003080', '10003149',
                '10003153', '10003216', '10003361', '10003374', '10003386',
                '10003398', '10003402', '10003408', '10003442', '10003476',
                '10003488', '10003513', '10003528', '10003533', '10003534',
                '10003544', '10003559', '10003585', '10003685', '10003695',
                '10003703', '10003711', '10003719', '10003722', '10003727',
                '10003733', '10003750', '10003751', '10003782', '10003785',
                '10003801', '10003811', '10003846', '10003850', '10003853',
                '10003879', '10003909', '10003975', '10003977', '10004038',
                '10004047', '10004054', '10004065', '10004083', '10004086',
                '10004092', '10004094', '10004097', '10004100', '10004109',
                '10004113', '10004118', '10004144', '10004146', '10004153',
                '10004160', '10004163', '10004168', '10010723', '10010732',
                '10010804', '10010828', '10010842', '10010870', '10010872',
                '10010879', '10010933', '10010938', '10010981', '10010992',
                '10011013', '10011019', '10011026', '10011028', '10011054',
                '10011090', '10011094', '10011123', '10011132', '10011144',
                '10011152', '10011164', '10011183', '10011220', '10011247',
                '10011295', '10011298', '10011325']

    json_list2 = ['588017703996096547', '587738569780428805', '587735695913320507', '587742775634624545', 
                '587732769983889439', '588017725475782665', '588017702391578633', '588297864730181658', 
                '588017704545812500', '588017566564155399', '588298663573454909', '587726014001512533', 
                '587739098063044622', '587742615095935051', '588009371227258884', '587733410447491082', 
                '587724648188543033', '587739720286863441', '588017704536244309', '587738947748626521', 
                '588017704542404685', '587731869633871916', '587742191517433893', '588017111295197219', 
                '587726015088623663', '587731512078893077', '587735696987193397', '587734893290848319', 
                '588017110759243821', '588017569236910086', '587738067813924971', '587738569776955447', 
                '587736586036117538', '588017565490085907', '588017724937076758', '587722982832013381', 
                '588007004186476581', '588010360698961934', '587739505005297793', '587735348038467644', 
                '588017948813492313', '587722982831423597', '587732482744975451', '587728879794782218', 
                '587741828582604849', '587737827291693069', '588011218064769056', '588017948822863950', 
                '587739131878703149', '588010878226399343', '588017565490741294', '588017704007172105', 
                '588017949895819327', '587735349112799302', '587738946132770821', '587732576700399634', 
                '588017728153059441', '587729776369991770', '587735349112340576', '587729159500988440', 
                '587738410330292307', '588017703470628953', '587736584961982478', '588017725473947655', 
                '588017729224900665', '588017112366841905', '587739158191145031', '587735348564787262', 
                '587726031180660845', '588017719573086223', '588298664117076044', '587726032266526801', 
                '587742062688796700', '587737808501932038', '587729159502299191', '587742864209084513', 
                '587726014532354067', '588017704006975536', '588017726012129401', '588017702398328858', 
                '587739099129380912', '587736941444530242', '587732582056525908', '588017605758550042', 
                '588017978901528612', '587725474420097049', '587726014532550731', '588017565483859979', 
                '588017703482032232', '587735344799350868', '587741722823819271', '588017569236910085', 
                '587731870707089488', '588848899380084803', '587735696440623158']

    for id in json_list2:
        with open('data/'+id+'.json','w') as f:
            out=json.dump(get_path('gz2',id),f)

    for id in json_list3:
        with open('data/'+id+'.json','w') as f:
            out=json.dump(get_path('gz3',id),f)
