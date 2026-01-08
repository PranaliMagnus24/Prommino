<!-- ================= NAVBAR ================= -->
<nav class="navbar navbar-dark sticky-top flex-md-nowrap p-1 shadow">
    <button class="btn btn-dark d-md-none ms-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#mobileSidebar">
        <i class="ri-menu-line"></i>
    </button>

    <a class="navbar-brand col-sm-3 col-md-2 me-0 px-3" href="#">Admin</a>

    <ul class="navbar-nav px-3">
        <li class="nav-item">
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <a class="nav-link text-dark" onclick="event.preventDefault(); this.closest('form').submit();"
                    href="{{ route('logout') }}">
                    <i class="ri-logout-circle-r-line me-1"></i> Logout
                </a>
            </form>
        </li>
    </ul>
</nav>
