<?php
class ArtistController extends Zend_Controller_Action
{
    private $_layout;

    public function init()
    {
      $this->_layout = $this->_helper->getHelper('Layout');
    }
    public function indexAction()
    {
        
    }

    public function musicAction()
    {
      $this->_layout->setLayout('artist_view');
      $artistId = $this->getRequest()->getParam('artistId');
//      var_dump($artistId); die;
      $this->_addMediaBoxPlugin();
      $this->view->assign('artistId', $artistId);
    }

    public function blogAction()
    {
      $this->_layout->setLayout('artist_view');
    }

    public function eventAction()
    {
      $this->_layout->setLayout('artist_view');
    }

    private function _addMediaBoxPlugin()
    {
      $this->view->headScript()->appendFile('/mediabox/js/ttw.mediabox.js');
      $this->view->headScript()->appendFile('/mediabox/js/yepnope.1.0.1-min.js');
      $this->view->headLink()->appendStylesheet('/mediabox/css/style.css');
    }
}

?>
