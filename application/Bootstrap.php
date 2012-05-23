<?php
class Bootstrap extends Zend_Application_Bootstrap_Bootstrap
{
    protected function _initViewSettings()
    {
        $this->bootstrap('view');

        $this->_view = $this->getResource('view');

        // add global helpers
        $this->_view->addHelperPath(APPLICATION_PATH . '/views/helpers', 'Zend_View_Helper');

        // set encoding and doctype
        $this->_view->setEncoding('UTF-8');
        $this->_view->doctype('XHTML1_STRICT');

        // set the content type and language
        $this->_view->headMeta()->appendHttpEquiv('Content-Type', 'text/html; charset=UTF-8');
        $this->_view->headMeta()->appendHttpEquiv('Content-Language', 'en-US');

        $this->_view->headLink()->appendStylesheet('/css/main-stylesheet.css');
        $this->_view->headLink()->appendStylesheet('/css/jquery.fancybox.css');
        $this->_view->headLink()->appendStylesheet('/css/shortcodes.css');
        
        $this->_view->headScript()->appendFile('/js/jquery.min.js');
        $this->_view->headScript()->appendFile('/js/scripts.js');
        $this->_view->headScript()->appendFile('/js/cufon-yui.js');
        $this->_view->headScript()->appendFile('/js/jquery.cookie.js');
        $this->_view->headScript()->appendFile('/js/jquery.fancybox.js');
        $this->_view->headScript()->appendFile('/js/jquery.placeholder.min.js');
        $this->_view->headScript()->appendFile('/js/jquery.sexyslider.js');
        $this->_view->headScript()->appendFile('/js/artpost.font.js');
        $this->_view->headScript()->appendFile('/js/cufon-replace.js');
        $this->_view->headScript()->appendFile('/js/prima.font.js');
        $this->_view->headScript()->appendFile('/js/goodwolf-toolbar.js');

        // setting the site in the title
        $this->_view->headTitle('Goodwolf Music');
    }

    /**
     * Add required routes to the router
     */
    protected function _initRoutes()
    {
        $this->bootstrap('frontController');

        $router = $this->frontController->getRouter();

        $route = new Zend_Controller_Router_Route(
            '',
            array(
                'action'     => 'index',
                'controller' => 'index',
                'module'     => 'default'
            )
        );

        $router->addRoute('default', $route);

        $route = new Zend_Controller_Router_Route(
            'artist/view/:artistId/music',
            array(
                'action'     => 'music',
                'controller' => 'artist',
                'module'     => 'default'
            )
        );

        $router->addRoute('artist_music_view', $route);

        $route = new Zend_Controller_Router_Route(
            'artist/view/:artistId/blog/:blogId',
            array(
                'action'     => 'blog',
                'controller' => 'artist',
                'module'     => 'default'
            )
        );

        $router->addRoute('artist_blog_view', $route);

        $route = new Zend_Controller_Router_Route(
            'artist/view/:artistId/event/:eventId',
            array(
                'action'     => 'event',
                'controller' => 'artist',
                'module'     => 'default'
            )
        );

        $router->addRoute('artist_event_view', $route);
        
        $route = new Zend_Controller_Router_Route(
            '/contact',
            array(
                'action'     => 'contact',
                'controller' => 'index',
                'module'     => 'default'
            )
        );

        $router->addRoute('contact_admin', $route);

//        // catalog category product route
//        $route = new Zend_Controller_Router_Route(
//            'catalog/:categoryIdent/:productIdent',
//            array(
//                'action'        => 'view',
//                'controller'    => 'catalog',
//                'module'        => 'storefront',
//                'categoryIdent' => '',
//            ),
//            array(
//                'categoryIdent' => '[a-zA-Z-_0-9]+',
//                'productIdent'  => '[a-zA-Z-_0-9]+'
//            )
//        );
//
//        $router->addRoute('catalog_category_product', $route);
//
//        // catalog category route
//        $route = new Zend_Controller_Router_Route(
//            'catalog/:categoryIdent/:page',
//            array(
//                'action'        => 'index',
//                'controller'    => 'catalog',
//                'module'        => 'storefront',
//                'categoryIdent' => '',
//                'page'          => 1
//            ),
//            array(
//                'categoryIdent' => '[a-zA-Z-_0-9]+',
//                'page'          => '\d+'
//            )
//        );
//
//        $router->addRoute('catalog_category', $route);
    }
}
?>