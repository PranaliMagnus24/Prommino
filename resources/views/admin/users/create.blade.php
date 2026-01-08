@extends('admin.layouts.layout')

@section('title', 'User')
<style>
    .stepper {
        display: flex;
        justify-content: space-between;
    }

    .step {
        text-align: center;
        width: 100%;
        position: relative;
    }

    .step-number {
        width: 28px;
        height: 28px;
        background: #adb5bd;
        color: #fff;
        border-radius: 50%;
        display: inline-flex;
        justify-content: center;
        align-items: center;
    }

    .step.active .step-number {
        background: #0d6efd;
    }

    .step-title {
        font-size: 13px;
        margin-top: 6px;
    }
</style>

@section('content')
    <div class="container-fluid py-4">
        <!-- Header -->
        <div class="card mb-3 border-0 shadow-sm">
            <div class="card-body">
                <h5 class="mb-0 fw-semibold">User Form</h5>
                <a href="{{ route('users.index') }}" class="btn btn-link btn-sm mt-2">← Back to Users</a>
            </div>
        </div>
        <!-- Tab Card -->
        <form id="userForm" method="POST" action="{{ route('users.store') }}">
            @csrf
            <div class="card border-0 shadow-sm">
                <div class="card-body">

                    <!-- Stepper -->
                    <div class="stepper mb-4">
                        <div class="step active" data-step="0">
                            <div class="step-number">1</div>
                            <div class="step-title">Personal Information</div>
                        </div>
                        <div class="step" data-step="1">
                            <div class="step-number">2</div>
                            <div class="step-title">Details</div>
                        </div>
                        <div class="step" data-step="2">
                            <div class="step-number">3</div>
                            <div class="step-title">Skills Details</div>
                        </div>
                        <div class="step" data-step="3">
                            <div class="step-number">4</div>
                            <div class="step-title">Credential Details</div>
                        </div>
                    </div>

                    <hr>

                    <!-- Tabs Content -->
                    <div class="tab-content">

                        <!-- STEP 1 -->
                        <div class="tab-pane fade show active step-content">
                            <h5>Personal Details</h5>
                            <div class="mb-3">
                                <label for="name" class="form-label">Name</label>
                                <input type="text" class="form-control" id="name" name="name"
                                    value="{{ old('name') }}">
                                @error('name')
                                    <span class="text-danger">{{ $message }}</span>
                                @enderror
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control" name="email" value="{{ old('email') }}">
                                @error('email')
                                    <span class="text-danger">{{ $message }}</span>
                                @enderror
                            </div>
                            <div class="mb-3">
                                <label for="phone" class="form-label">Phone</label>
                                <input type="text" class="form-control" id="phone" name="phone" maxlength="10"
                                    minlength="10" value="{{ old('phone') }}">
                                @error('phone')
                                    <span class="text-danger">{{ $message }}</span>
                                @enderror
                            </div>
                        </div>

                        <!-- STEP 2 -->
                        <div class="tab-pane fade step-content">
                            <h5>Details</h5>
                            <div class="mb-3">
                                <label for="country" class="form-label">Country</label>
                                <input type="text" class="form-control" id="country" name="country"
                                    value="{{ old('country') }}">
                                @error('country')
                                    <span class="text-danger">{{ $message }}</span>
                                @enderror
                            </div>
                            <div class="mb-3">
                                <label for="state" class="form-label">State</label>
                                <input type="text" class="form-control" id="state" name="state"
                                    value="{{ old('state') }}">
                                @error('state')
                                    <span class="text-danger">{{ $message }}</span>
                                @enderror
                            </div>
                        </div>

                        <!-- STEP 3 -->
                        <div class="tab-pane fade step-content">
                            <h5>Skills</h5>
                            <div id="skills-container">
                                <div class="skill-row mb-3 d-flex align-items-center">
                                    <input type="text" class="form-control me-2 skill-input flex-grow-1" name="skills[]"
                                        placeholder="Enter skill" style="max-width: 600px;">
                                    <button type="button" class="btn btn-outline-danger btn-sm remove-skill"
                                        style="width: 40px;">×</button>
                                </div>
                            </div>
                            <button type="button" class="btn btn-outline-success btn-sm" id="add-skill"
                                style="width: auto;">
                                <i class="fas fa-plus"></i> Add New Skill
                            </button>
                        </div>

                        <!-- STEP 4 -->
                        <div class="tab-pane fade step-content">
                            <h5>Credentials</h5>
                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="password" name="password">
                            </div>

                        </div>

                    </div>

                    <div class="d-flex align-items-center flex-wrap mt-4">
                        <div class="ms-auto">
                            <button type="button" class="btn btn-outline-secondary" id="prevBtn">
                                BACK
                            </button>
                        </div>

                        <div class="ms-auto">
                            <button type="button" class="btn btn-primary" id="nextBtn">
                                NEXT
                            </button>
                        </div>
                    </div>


                </div>
            </div>
        </form>


    </div>
@endsection
@section('scripts')
    <script>
        let currentStep = 0;
        const steps = document.querySelectorAll('.step');
        const contents = document.querySelectorAll('.step-content');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');

        function showStep(step) {
            contents.forEach((content, index) => {
                content.classList.remove('show', 'active');
                if (index === step) {
                    content.classList.add('show', 'active');
                }
            });

            steps.forEach((s, index) => {
                s.classList.toggle('active', index === step);
            });

            prevBtn.disabled = step === 0;
            nextBtn.innerText = step === steps.length - 1 ? 'SUBMIT' : 'NEXT';
        }

        nextBtn.addEventListener('click', function() {
            if (currentStep < steps.length - 1) {
                currentStep++;
                showStep(currentStep);
            } else {
                document.getElementById('userForm').submit();
            }
        });

        prevBtn.addEventListener('click', function() {
            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
            }
        });

        // Skills functionality
        document.getElementById('add-skill').addEventListener('click', function() {
            addSkillRow();
        });

        document.getElementById('skills-container').addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-skill')) {
                e.target.closest('.skill-row').remove();
            }
        });

        function addSkillRow() {
            const container = document.getElementById('skills-container');
            const row = document.createElement('div');
            row.className = 'skill-row mb-3 d-flex align-items-center';
            row.innerHTML = `
                <input type="text" class="form-control me-2 skill-input flex-grow-1" name="skills[]" placeholder="Enter skill" style="max-width: 600px;">
                <button type="button" class="btn btn-outline-danger btn-sm remove-skill" style="width: 40px;">×</button>
            `;
            container.appendChild(row);
        }
    </script>
@endsection
