<?php

class IndexController extends Zend_Controller_Action
{

   public function init()
   {

   }
   
   public function indexAction()
   {
     $request = Zend_Controller_Front::getInstance()->getRequest();
     $layout = $this->_helper->getHelper('Layout');
     $layout->setLayout('artist_view');
     // setting a separator string for segments:
     $this->view->headTitle()->setSeparator(' / ');
     $this->view->show = 'Zend Framework training course in www.zend.vn<br>Front-End';

   }
}
?>
