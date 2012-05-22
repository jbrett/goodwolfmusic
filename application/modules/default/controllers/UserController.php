<?php
require_once 'Zend/Controller/Action.php';
require_once 'Zend/Db/Adapter/Pdo/Mysql.php';

class UserController extends Zend_Controller_Action
{

  public function init()
  {
  }
  
  public function registerAction()
  {
    $request = $this->getRequest();
    $this->view->assign('action',"process");
    $this->view->assign('title','Member Registration');
    $this->view->assign('label_fname','First Name');
    $this->view->assign('label_lname','Last Name');
    $this->view->assign('label_uname','User Name');
    $this->view->assign('label_pass','Password');
    $this->view->assign('label_submit','Register');
    $this->view->assign('description','Please enter this form completely:');
  }


  public function processAction()
  {
    $params = array('host'      =>'127.0.0.1',
                    'username'  =>'root',
                    'password'  =>'wh1t3w1nt3rhymn@l',
                    'dbname'    =>'goodwolf',
                    'port'      => '3306'
                   );
    $DB = new Zend_Db_Adapter_Pdo_Mysql($params);
    $request = $this->getRequest();
    $firstName = $request->getParam('first_name');
    $sql = "INSERT INTO `user`
            (`first_name` , `last_name` ,`username` ,`password`)
            VALUES
            ('".$request->getParam('first_name')."', '".$request->getParam('last_name')."', '".$request->getParam('username')."', MD5('".$request->getParam('password')."'))";
    $DB->query($sql);
    $this->view->assign('title','Registration Process');
    $this->view->assign('description','Registration succes');
  }
}
?>
